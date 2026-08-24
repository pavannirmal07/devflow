-- Migration: Task-Session Status Sync (V2)
-- Updates public.start_session RPC to:
-- 1. Validate task ownership (auth.uid() = tasks.user_id)
-- 2. Reject starting a session on a completed/done task
-- 3. Atomically transition non-in-progress tasks to 'in_progress'
-- 4. Create the active session with dual-anchor timing

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
  v_task_status public.task_status;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'Session title cannot be empty';
  end if;

  -- Validate task ownership and status when p_task_id is provided
  if p_task_id is not null then
    select status into v_task_status
    from public.tasks
    where id = p_task_id and user_id = v_user_id;

    if not found then
      raise exception 'Invalid task_id or unauthorized';
    end if;

    if v_task_status in ('completed', 'done') then
      raise exception 'Cannot start a session for a completed task';
    end if;

    -- If the task is not already in_progress, atomically transition it to in_progress
    if v_task_status != 'in_progress' then
      update public.tasks
      set status = 'in_progress',
          updated_at = now()
      where id = p_task_id and user_id = v_user_id;
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

grant execute on function public.start_session(text, text, uuid) to authenticated;
