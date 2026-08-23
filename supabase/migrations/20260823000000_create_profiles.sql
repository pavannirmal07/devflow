-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  raw_name text;
  formatted_name text;
  raw_avatar text;
begin
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(initcap(regexp_replace(split_part(new.email, '@', 1), '[._-]+', ' ', 'g'))), '')
  );

  if raw_name is null then
    formatted_name := 'Developer';
  else
    formatted_name := raw_name;
  end if;

  raw_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), ''),
    nullif(trim(new.raw_user_meta_data->>'avatar'), '')
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, formatted_name, raw_avatar)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(initcap(regexp_replace(split_part(u.email, '@', 1), '[._-]+', ' ', 'g'))), ''),
    'Developer'
  ) as display_name,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(u.raw_user_meta_data->>'picture'), ''),
    nullif(trim(u.raw_user_meta_data->>'avatar'), '')
  ) as avatar_url
from auth.users u
on conflict (id) do nothing;
