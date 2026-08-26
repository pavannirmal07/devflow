-- Migration: Add GitHub Issues Support to task_github_links
-- Updates the check constraint on public.task_github_links.link_type to support 'issue'

-- 1. Drop existing link_type check constraints if any
do $$
declare
  chk_record record;
begin
  for chk_record in (
    select conname
    from pg_constraint
    where conrelid = 'public.task_github_links'::regclass
      and contype = 'c'
      and conname like '%link_type%'
  ) loop
    execute format('alter table public.task_github_links drop constraint if exists %I', chk_record.conname);
  end loop;
end $$;

alter table public.task_github_links
  drop constraint if exists task_github_links_link_type_check;

-- 2. Add updated constraint allowing branch, pull_request, commit, and issue
alter table public.task_github_links
  add constraint task_github_links_link_type_check
  check (link_type in ('branch', 'pull_request', 'commit', 'issue'));
