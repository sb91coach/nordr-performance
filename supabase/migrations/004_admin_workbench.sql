-- NORDR Performance — Admin workbench schema
-- Migration: 004_admin_workbench.sql
-- Run in Supabase SQL Editor after previous migrations.
-- No secrets in this file.

-- ---------------------------------------------------------------------------
-- admin_users: authorised NORDR internal operators only
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Authorised NORDR admin accounts. Membership is the security boundary for admin RLS policies.';

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;

-- Admins can confirm their own membership (needed for client session checks)
create policy admin_users_select_self
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- consultancy_cases: internal workflow overlay for System Check submissions
-- ---------------------------------------------------------------------------

create table if not exists public.consultancy_cases (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.system_check_submissions(id) on delete cascade,
  engagement_status text not null default 'New',
  internal_notes text null,
  next_action text null,
  follow_up_date date null,
  lead_source text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultancy_cases_engagement_status_check
    check (engagement_status in (
      'New',
      'Reviewed',
      'Discovery Booked',
      'Diagnostic Proposed',
      'Active',
      'Closed'
    )),
  constraint consultancy_cases_lead_source_check
    check (
      lead_source is null
      or lead_source in (
        'Direct',
        'LinkedIn',
        'Instagram',
        'Referral',
        'Website',
        'Other'
      )
    )
);

comment on table public.consultancy_cases is
  'Internal consultancy workflow for a System Check submission. Does not alter immutable assessment data.';

create index if not exists consultancy_cases_engagement_status_idx
  on public.consultancy_cases (engagement_status);

create index if not exists consultancy_cases_follow_up_date_idx
  on public.consultancy_cases (follow_up_date);

create index if not exists consultancy_cases_updated_at_idx
  on public.consultancy_cases (updated_at desc);

drop trigger if exists consultancy_cases_set_updated_at on public.consultancy_cases;
create trigger consultancy_cases_set_updated_at
  before update on public.consultancy_cases
  for each row
  execute function public.set_updated_at();

alter table public.consultancy_cases enable row level security;

revoke all on table public.consultancy_cases from anon, authenticated;

-- Helper: is current user an authorised admin?
create or replace function public.is_nordr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_nordr_admin() from public;
grant execute on function public.is_nordr_admin() to authenticated;

-- consultancy_cases policies (admin only)
create policy consultancy_cases_admin_select
  on public.consultancy_cases for select to authenticated
  using (public.is_nordr_admin());

create policy consultancy_cases_admin_insert
  on public.consultancy_cases for insert to authenticated
  with check (public.is_nordr_admin());

create policy consultancy_cases_admin_update
  on public.consultancy_cases for update to authenticated
  using (public.is_nordr_admin())
  with check (public.is_nordr_admin());

grant select, insert, update on table public.consultancy_cases to authenticated;

-- ---------------------------------------------------------------------------
-- Admin read access to System Check data (no public/anon access)
-- ---------------------------------------------------------------------------

grant select on table public.contacts to authenticated;
grant select on table public.system_check_submissions to authenticated;
grant select on table public.system_check_responses to authenticated;
grant select on table public.system_check_patterns to authenticated;
grant select on table public.system_check_priority_questions to authenticated;

drop policy if exists contacts_admin_select on public.contacts;
create policy contacts_admin_select
  on public.contacts for select to authenticated
  using (public.is_nordr_admin());

drop policy if exists submissions_admin_select on public.system_check_submissions;
create policy submissions_admin_select
  on public.system_check_submissions for select to authenticated
  using (public.is_nordr_admin());

drop policy if exists responses_admin_select on public.system_check_responses;
create policy responses_admin_select
  on public.system_check_responses for select to authenticated
  using (public.is_nordr_admin());

drop policy if exists patterns_admin_select on public.system_check_patterns;
create policy patterns_admin_select
  on public.system_check_patterns for select to authenticated
  using (public.is_nordr_admin());

drop policy if exists priority_questions_admin_select on public.system_check_priority_questions;
create policy priority_questions_admin_select
  on public.system_check_priority_questions for select to authenticated
  using (public.is_nordr_admin());

-- ---------------------------------------------------------------------------
-- Auto-create consultancy_case when a System Check submission is stored
-- ---------------------------------------------------------------------------

create or replace function public.ensure_consultancy_case_for_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consultancy_cases (submission_id, engagement_status)
  values (new.id, 'New')
  on conflict (submission_id) do nothing;
  return new;
end;
$$;

drop trigger if exists system_check_submissions_ensure_case on public.system_check_submissions;
create trigger system_check_submissions_ensure_case
  after insert on public.system_check_submissions
  for each row
  execute function public.ensure_consultancy_case_for_submission();

-- Backfill cases for existing submissions
insert into public.consultancy_cases (submission_id, engagement_status)
select s.id, 'New'
from public.system_check_submissions s
where not exists (
  select 1 from public.consultancy_cases c where c.submission_id = s.id
);

notify pgrst, 'reload schema';
