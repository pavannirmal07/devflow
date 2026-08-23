-- Ensure custom enum types exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
  end if;
end $$;

-- Ensure 'completed' value is present in task_status enum
alter type public.task_status add value if not exists 'completed';

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was created previously
alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists status public.task_status default 'todo',
  add column if not exists priority public.task_priority default 'medium',
  add column if not exists due_date date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Ensure project_id is nullable so ON DELETE SET NULL can execute without constraint violation
alter table public.tasks
  alter column project_id drop not null;

-- Ensure project_id foreign key explicitly uses ON DELETE SET NULL
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
      and tc.table_name = 'tasks'
      and kcu.column_name = 'project_id'
  ) loop
    execute format('alter table public.tasks drop constraint if exists %I', fk_record.constraint_name);
  end loop;
end $$;

alter table public.tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id)
  references public.projects(id)
  on delete set null;

-- Indexes
create index if not exists idx_tasks_user_id_updated_at
  on public.tasks (user_id, updated_at desc);

create index if not exists idx_tasks_user_id_status
  on public.tasks (user_id, status);

create index if not exists idx_tasks_user_id_project_id
  on public.tasks (user_id, project_id);

-- Row Level Security
alter table public.tasks enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks"
  on public.tasks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();
