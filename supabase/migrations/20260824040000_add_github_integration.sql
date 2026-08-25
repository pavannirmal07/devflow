-- Migration: GitHub Integration V1 (public.github_installations, projects github fields, public.task_github_links)
-- Creates tables for user GitHub installations and task development links with RLS, cascade deletion, and updated_at triggers.

-- 1. GitHub Installations table
create table if not exists public.github_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null,
  account_login text not null,
  account_type text not null default 'User',
  account_avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was partially created
alter table public.github_installations
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists installation_id bigint,
  add column if not exists account_login text,
  add column if not exists account_type text default 'User',
  add column if not exists account_avatar_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Unique constraint / index per user + installation
create unique index if not exists idx_github_installations_user_installation
  on public.github_installations (user_id, installation_id);

-- Enable RLS on github_installations
alter table public.github_installations enable row level security;

-- Drop existing policies if any to ensure clean definitions
drop policy if exists "Users can view own github installations" on public.github_installations;
drop policy if exists "Users can insert own github installations" on public.github_installations;
drop policy if exists "Users can update own github installations" on public.github_installations;
drop policy if exists "Users can delete own github installations" on public.github_installations;

create policy "Users can view own github installations"
  on public.github_installations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own github installations"
  on public.github_installations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own github installations"
  on public.github_installations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own github installations"
  on public.github_installations
  for delete
  using (auth.uid() = user_id);

-- 2. Add optional GitHub fields to public.projects
alter table public.projects
  add column if not exists github_repository_id bigint,
  add column if not exists github_owner text,
  add column if not exists github_repo text,
  add column if not exists github_default_branch text,
  add column if not exists github_installation_id bigint;

-- 3. Task GitHub Links table
create table if not exists public.task_github_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  link_type text not null check (link_type in ('branch', 'pull_request', 'commit')),
  github_id text not null,
  name text not null,
  url text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was created previously
alter table public.task_github_links
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists link_type text,
  add column if not exists github_id text,
  add column if not exists name text,
  add column if not exists url text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Index on (task_id, link_type)
create index if not exists idx_task_github_links_task_link_type
  on public.task_github_links (task_id, link_type);

-- Enable RLS on task_github_links
alter table public.task_github_links enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own task github links" on public.task_github_links;
drop policy if exists "Users can insert own task github links" on public.task_github_links;
drop policy if exists "Users can update own task github links" on public.task_github_links;
drop policy if exists "Users can delete own task github links" on public.task_github_links;

create policy "Users can view own task github links"
  on public.task_github_links
  for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_links.task_id
        and t.user_id = auth.uid()
    )
  );

create policy "Users can insert own task github links"
  on public.task_github_links
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_links.task_id
        and t.user_id = auth.uid()
    )
  );

create policy "Users can update own task github links"
  on public.task_github_links
  for update
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_links.task_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_links.task_id
        and t.user_id = auth.uid()
    )
  );

create policy "Users can delete own task github links"
  on public.task_github_links
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_links.task_id
        and t.user_id = auth.uid()
    )
  );

-- 4. Triggers for updated_at
drop trigger if exists set_github_installations_updated_at on public.github_installations;
create trigger set_github_installations_updated_at
  before update on public.github_installations
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_task_github_links_updated_at on public.task_github_links;
create trigger set_task_github_links_updated_at
  before update on public.task_github_links
  for each row
  execute function public.handle_updated_at();
