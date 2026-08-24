-- Migration: Task-Session Integration (V1)
-- Adds task_id foreign key to public.sessions with ON DELETE SET NULL,
-- drops legacy start_session(text, text) overload to prevent ambiguity,
-- and updates start_session RPC to accept p_task_id with user ownership validation.

-- 1. Add task_id column
alter table public.sessions
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

-- 2. Explicitly ensure foreign key constraint with ON DELETE SET NULL
do $$
declare
  fk_record record;
begin
  for fk_record in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'sessions'
      and kcu.column_name = 'task_id'
  ) loop
    execute format('alter table public.sessions drop constraint if exists %I', fk_record.constraint_name);
  end loop;
end $$;

alter table public.sessions
  add constraint sessions_task_id_fkey
  foreign key (task_id)
  references public.tasks(id)
  on delete set null;

-- 3. Create index for user + task lookup
create index if not exists idx_sessions_user_id_task_id
  on public.sessions (user_id, task_id);

-- 4. Drop legacy 2-argument start_session function to avoid overload ambiguity
drop function if exists public.start_session(text, text);

-- 5. Create 3-argument start_session RPC
create or replace function public.start_session(
  p_title text,
  p_description text default null,
  p_task_id uuid default null
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

  -- Validate task ownership when p_task_id is provided
  if p_task_id is not null then
    if not exists (
      select 1 from public.tasks
      where id = p_task_id and user_id = v_user_id
    ) then
      raise exception 'Invalid task_id or unauthorized';
    end if;
  end if;

  insert into public.sessions (
    user_id,
    task_id,
    title,
    description,
    status,
    started_at,
    accumulated_seconds,
    last_resumed_at
  )
  values (
    v_user_id,
    p_task_id,
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

-- 6. Grant execute permission on the updated RPC function
grant execute on function public.start_session(text, text, uuid) to authenticated;
