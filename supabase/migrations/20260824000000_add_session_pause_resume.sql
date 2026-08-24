-- Migration: Sessions V2 - Pause & Resume Support with Atomic RPC Functions
-- Adds accumulated_seconds and last_resumed_at, supports 'paused' status,
-- updates in-progress uniqueness constraint, and provides secure RPC functions.

-- 1. Add accumulated_seconds and last_resumed_at columns
alter table public.sessions
  add column if not exists accumulated_seconds integer not null default 0,
  add column if not exists last_resumed_at timestamptz;

-- 2. Safe backfill for existing sessions
update public.sessions
  set last_resumed_at = started_at,
      accumulated_seconds = coalesce(accumulated_seconds, 0)
  where status = 'active' and last_resumed_at is null;

update public.sessions
  set accumulated_seconds = coalesce(duration_seconds, 0)
  where status = 'completed' and (accumulated_seconds is null or accumulated_seconds = 0);

-- 3. Update status and ended_at constraints
alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('active', 'paused', 'completed'));

alter table public.sessions
  drop constraint if exists sessions_status_ended_at_check;

alter table public.sessions
  add constraint sessions_status_ended_at_check
  check (
    (status in ('active', 'paused') and ended_at is null) or
    (status = 'completed' and ended_at is not null)
  );

-- 4. Update unique index to allow only ONE in-progress (active OR paused) session per user
drop index if exists public.idx_sessions_single_active;
drop index if exists public.idx_sessions_single_in_progress;

create unique index if not exists idx_sessions_single_in_progress
  on public.sessions (user_id)
  where (status in ('active', 'paused'));

-- 5. RPC: start_session
create or replace function public.start_session(
  p_title text,
  p_description text default null
)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'Session title cannot be empty';
  end if;

  insert into public.sessions (
    user_id,
    title,
    description,
    status,
    started_at,
    accumulated_seconds,
    last_resumed_at
  )
  values (
    v_user_id,
    trim(p_title),
    nullif(trim(p_description), ''),
    'active',
    now(),
    0,
    now()
  )
  returning * into v_session;

  return v_session;
end;
$$;

-- 6. RPC: pause_session
create or replace function public.pause_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.sessions
  set
    status = 'paused',
    accumulated_seconds = accumulated_seconds + greatest(0, round(extract(epoch from (now() - last_resumed_at)))::integer),
    last_resumed_at = null,
    updated_at = now()
  where id = p_session_id
    and user_id = v_user_id
    and status = 'active'
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Active session not found or unauthorized';
  end if;

  return v_session;
end;
$$;

-- 7. RPC: resume_session
create or replace function public.resume_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.sessions
  set
    status = 'active',
    last_resumed_at = now(),
    updated_at = now()
  where id = p_session_id
    and user_id = v_user_id
    and status = 'paused'
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Paused session not found or unauthorized';
  end if;

  return v_session;
end;
$$;

-- 8. RPC: complete_session
create or replace function public.complete_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sessions;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.sessions
  set
    status = 'completed',
    ended_at = now(),
    duration_seconds = case
      when status = 'active' then accumulated_seconds + greatest(0, round(extract(epoch from (now() - last_resumed_at)))::integer)
      else accumulated_seconds
    end,
    last_resumed_at = null,
    updated_at = now()
  where id = p_session_id
    and user_id = v_user_id
    and status in ('active', 'paused')
  returning * into v_session;

  if v_session.id is null then
    raise exception 'In-progress session not found or unauthorized';
  end if;

  return v_session;
end;
$$;

-- 9. Grant RPC execution to authenticated users
grant execute on function public.start_session(text, text) to authenticated;
grant execute on function public.pause_session(uuid) to authenticated;
grant execute on function public.resume_session(uuid) to authenticated;
grant execute on function public.complete_session(uuid) to authenticated;
