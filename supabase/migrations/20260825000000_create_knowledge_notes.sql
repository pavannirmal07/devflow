-- Knowledge Notes table for DevFlow Technical Notes & Engineering Journal
create table if not exists public.knowledge_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  problem text,
  investigation text,
  root_cause text,
  solution text,
  lessons_learned text,
  content text,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  category text default 'Bugfix',
  tags text[] not null default '{}'::text[],
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was created previously
alter table public.knowledge_notes
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists problem text,
  add column if not exists investigation text,
  add column if not exists root_cause text,
  add column if not exists solution text,
  add column if not exists lessons_learned text,
  add column if not exists content text,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists task_id uuid references public.tasks(id) on delete set null,
  add column if not exists category text default 'Bugfix',
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists is_pinned boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Ensure project_id foreign key ON DELETE SET NULL
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
      and tc.table_name = 'knowledge_notes'
      and kcu.column_name = 'project_id'
  ) loop
    execute format('alter table public.knowledge_notes drop constraint if exists %I', fk_record.constraint_name);
  end loop;
end $$;

alter table public.knowledge_notes
  add constraint knowledge_notes_project_id_fkey
  foreign key (project_id)
  references public.projects(id)
  on delete set null;

-- Ensure task_id foreign key ON DELETE SET NULL
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
      and tc.table_name = 'knowledge_notes'
      and kcu.column_name = 'task_id'
  ) loop
    execute format('alter table public.knowledge_notes drop constraint if exists %I', fk_record.constraint_name);
  end loop;
end $$;

alter table public.knowledge_notes
  add constraint knowledge_notes_task_id_fkey
  foreign key (task_id)
  references public.tasks(id)
  on delete set null;

-- Indexes
create index if not exists idx_knowledge_notes_user_id_updated_at
  on public.knowledge_notes (user_id, updated_at desc);

create index if not exists idx_knowledge_notes_user_id_is_pinned
  on public.knowledge_notes (user_id, is_pinned);

create index if not exists idx_knowledge_notes_user_id_project_id
  on public.knowledge_notes (user_id, project_id);

create index if not exists idx_knowledge_notes_user_id_task_id
  on public.knowledge_notes (user_id, task_id);

-- Row Level Security
alter table public.knowledge_notes enable row level security;

drop policy if exists "Users can view own knowledge notes" on public.knowledge_notes;
create policy "Users can view own knowledge notes"
  on public.knowledge_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own knowledge notes" on public.knowledge_notes;
create policy "Users can insert own knowledge notes"
  on public.knowledge_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own knowledge notes" on public.knowledge_notes;
create policy "Users can update own knowledge notes"
  on public.knowledge_notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own knowledge notes" on public.knowledge_notes;
create policy "Users can delete own knowledge notes"
  on public.knowledge_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
drop trigger if exists set_knowledge_notes_updated_at on public.knowledge_notes;
create trigger set_knowledge_notes_updated_at
  before update on public.knowledge_notes
  for each row execute function public.handle_updated_at();
