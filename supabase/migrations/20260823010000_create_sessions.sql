-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_status_check check (status in ('active', 'completed')),
  constraint sessions_status_ended_at_check check (
    (status = 'active' and ended_at is null) or
    (status = 'completed' and ended_at is not null)
  )
);

-- Indexes
create index if not exists idx_sessions_user_id_started_at
  on public.sessions (user_id, started_at desc);

create unique index if not exists idx_sessions_single_active
  on public.sessions (user_id)
  where (status = 'active');

-- Row Level Security
alter table public.sessions enable row level security;

drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions"
  on public.sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions"
  on public.sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.sessions;
create policy "Users can update own sessions"
  on public.sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.sessions;
create policy "Users can delete own sessions"
  on public.sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
  before update on public.sessions
  for each row execute function public.handle_updated_at();
