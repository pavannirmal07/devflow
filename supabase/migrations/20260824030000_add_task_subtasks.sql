-- Migration: Subtasks V1 (public.task_subtasks)
-- Creates task_subtasks table with RLS, cascade deletion on tasks, title constraint, ordering index, and updated_at trigger.

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_subtask_title_not_empty check (trim(title) <> '')
);

-- Ensure columns exist if table was created previously
alter table public.task_subtasks
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists title text,
  add column if not exists completed boolean default false,
  add column if not exists position integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Ensure task_id foreign key explicitly uses ON DELETE CASCADE
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
      and tc.table_name = 'task_subtasks'
      and kcu.column_name = 'task_id'
  ) loop
    execute format('alter table public.task_subtasks drop constraint if exists %I', fk_record.constraint_name);
  end loop;
end $$;

alter table public.task_subtasks
  add constraint task_subtasks_task_id_fkey
  foreign key (task_id)
  references public.tasks(id)
  on delete cascade;

-- Indexes
create index if not exists idx_task_subtasks_task_id_position
  on public.task_subtasks (task_id, position asc);

create index if not exists idx_task_subtasks_task_id
  on public.task_subtasks (task_id);

-- Row Level Security
alter table public.task_subtasks enable row level security;

drop policy if exists "Users can view subtasks of own tasks" on public.task_subtasks;
create policy "Users can view subtasks of own tasks"
  on public.task_subtasks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert subtasks to own tasks" on public.task_subtasks;
create policy "Users can insert subtasks to own tasks"
  on public.task_subtasks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update subtasks of own tasks" on public.task_subtasks;
create policy "Users can update subtasks of own tasks"
  on public.task_subtasks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete subtasks of own tasks" on public.task_subtasks;
create policy "Users can delete subtasks of own tasks"
  on public.task_subtasks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and t.user_id = auth.uid()
    )
  );

-- Auto-update updated_at timestamp
drop trigger if exists set_task_subtasks_updated_at on public.task_subtasks;
create trigger set_task_subtasks_updated_at
  before update on public.task_subtasks
  for each row execute function public.handle_updated_at();
