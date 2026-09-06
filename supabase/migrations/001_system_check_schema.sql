-- NORDR Performance System Check schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where practical.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  work_email text not null,
  organisation text not null,
  role text,
  sector text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  privacy_notice_version text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists contacts_work_email_lower_uidx
  on public.contacts (lower(work_email));

create index if not exists contacts_organisation_idx
  on public.contacts (organisation);

create index if not exists contacts_created_at_idx
  on public.contacts (created_at desc);

create table if not exists public.system_check_submissions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id),
  submission_version text not null,
  headline_question text,
  objective_index numeric,
  system_index numeric,
  human_index numeric,
  evidence_index numeric,
  decision_index numeric,
  outcome_index numeric,
  objective_status text,
  system_status text,
  human_status text,
  evidence_status text,
  decision_status text,
  outcome_status text,
  objective_confidence text,
  system_confidence text,
  human_confidence text,
  evidence_confidence text,
  decision_confidence text,
  outcome_confidence text,
  created_at timestamptz not null default now()
);

create index if not exists system_check_submissions_contact_id_idx
  on public.system_check_submissions (contact_id);

create index if not exists system_check_submissions_created_at_idx
  on public.system_check_submissions (created_at desc);

create table if not exists public.system_check_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  question_id text not null,
  response_code text,
  response_value numeric,
  raw_text text,
  created_at timestamptz not null default now()
);

create index if not exists system_check_responses_submission_id_idx
  on public.system_check_responses (submission_id);

create table if not exists public.system_check_patterns (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  pattern_id text not null,
  pattern_name text not null,
  priority integer,
  generated_question text,
  created_at timestamptz not null default now()
);

create index if not exists system_check_patterns_submission_id_idx
  on public.system_check_patterns (submission_id);

create table if not exists public.system_check_priority_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  question_order integer not null,
  question_text text not null,
  source_type text,
  source_id text,
  created_at timestamptz not null default now()
);

create index if not exists system_check_priority_questions_submission_id_idx
  on public.system_check_priority_questions (submission_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public clients must not have unrestricted read/write access.
-- The Vercel API uses the service_role key, which bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.contacts enable row level security;
alter table public.system_check_submissions enable row level security;
alter table public.system_check_responses enable row level security;
alter table public.system_check_patterns enable row level security;
alter table public.system_check_priority_questions enable row level security;

-- Explicitly deny anon/authenticated by having no permissive policies.
-- (service_role bypasses RLS)

revoke all on table public.contacts from anon, authenticated;
revoke all on table public.system_check_submissions from anon, authenticated;
revoke all on table public.system_check_responses from anon, authenticated;
revoke all on table public.system_check_patterns from anon, authenticated;
revoke all on table public.system_check_priority_questions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic submission function (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.submit_system_check(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact jsonb := payload->'contact';
  v_submission jsonb := payload->'submission';
  v_responses jsonb := payload->'responses';
  v_patterns jsonb := coalesce(payload->'patterns', '[]'::jsonb);
  v_priority_questions jsonb := coalesce(payload->'priority_questions', '[]'::jsonb);
  v_email text;
  v_contact_id uuid;
  v_submission_id uuid;
  v_marketing boolean;
  v_item jsonb;
begin
  if v_contact is null or v_submission is null or v_responses is null then
    raise exception 'Invalid submission payload';
  end if;

  v_email := lower(trim(v_contact->>'work_email'));
  if v_email is null or v_email = '' then
    raise exception 'work_email required';
  end if;

  v_marketing := coalesce((v_contact->>'marketing_consent')::boolean, false);

  select id into v_contact_id
  from public.contacts
  where lower(work_email) = v_email
  limit 1;

  if v_contact_id is null then
    insert into public.contacts (
      first_name,
      last_name,
      work_email,
      organisation,
      role,
      sector,
      marketing_consent,
      marketing_consent_at,
      privacy_notice_version
    ) values (
      trim(v_contact->>'first_name'),
      trim(v_contact->>'last_name'),
      v_email,
      trim(v_contact->>'organisation'),
      nullif(trim(v_contact->>'role'), ''),
      nullif(trim(v_contact->>'sector'), ''),
      v_marketing,
      case when v_marketing then now() else null end,
      trim(v_contact->>'privacy_notice_version')
    )
    returning id into v_contact_id;
  else
    update public.contacts
    set
      first_name = trim(v_contact->>'first_name'),
      last_name = trim(v_contact->>'last_name'),
      organisation = trim(v_contact->>'organisation'),
      role = nullif(trim(v_contact->>'role'), ''),
      sector = nullif(trim(v_contact->>'sector'), ''),
      privacy_notice_version = trim(v_contact->>'privacy_notice_version'),
      marketing_consent = case
        when v_marketing then true
        else marketing_consent
      end,
      marketing_consent_at = case
        when v_marketing and coalesce(marketing_consent, false) = false then now()
        when v_marketing then coalesce(marketing_consent_at, now())
        else marketing_consent_at
      end
    where id = v_contact_id;
  end if;

  insert into public.system_check_submissions (
    contact_id,
    submission_version,
    headline_question,
    objective_index, system_index, human_index, evidence_index, decision_index, outcome_index,
    objective_status, system_status, human_status, evidence_status, decision_status, outcome_status,
    objective_confidence, system_confidence, human_confidence, evidence_confidence, decision_confidence, outcome_confidence
  ) values (
    v_contact_id,
    v_submission->>'submission_version',
    v_submission->>'headline_question',
    nullif(v_submission->>'objective_index', '')::numeric,
    nullif(v_submission->>'system_index', '')::numeric,
    nullif(v_submission->>'human_index', '')::numeric,
    nullif(v_submission->>'evidence_index', '')::numeric,
    nullif(v_submission->>'decision_index', '')::numeric,
    nullif(v_submission->>'outcome_index', '')::numeric,
    v_submission->>'objective_status',
    v_submission->>'system_status',
    v_submission->>'human_status',
    v_submission->>'evidence_status',
    v_submission->>'decision_status',
    v_submission->>'outcome_status',
    v_submission->>'objective_confidence',
    v_submission->>'system_confidence',
    v_submission->>'human_confidence',
    v_submission->>'evidence_confidence',
    v_submission->>'decision_confidence',
    v_submission->>'outcome_confidence'
  )
  returning id into v_submission_id;

  for v_item in select * from jsonb_array_elements(v_responses)
  loop
    insert into public.system_check_responses (
      submission_id, question_id, response_code, response_value, raw_text
    ) values (
      v_submission_id,
      v_item->>'question_id',
      v_item->>'response_code',
      case
        when v_item->>'response_value' is null or v_item->>'response_value' = '' then null
        else (v_item->>'response_value')::numeric
      end,
      v_item->>'raw_text'
    );
  end loop;

  for v_item in select * from jsonb_array_elements(v_patterns)
  loop
    insert into public.system_check_patterns (
      submission_id, pattern_id, pattern_name, priority, generated_question
    ) values (
      v_submission_id,
      v_item->>'pattern_id',
      v_item->>'pattern_name',
      nullif(v_item->>'priority', '')::integer,
      v_item->>'generated_question'
    );
  end loop;

  for v_item in select * from jsonb_array_elements(v_priority_questions)
  loop
    insert into public.system_check_priority_questions (
      submission_id, question_order, question_text, source_type, source_id
    ) values (
      v_submission_id,
      (v_item->>'question_order')::integer,
      v_item->>'question_text',
      v_item->>'source_type',
      v_item->>'source_id'
    );
  end loop;

  return jsonb_build_object(
    'contact_id', v_contact_id,
    'submission_id', v_submission_id
  );
end;
$$;

revoke all on function public.submit_system_check(jsonb) from public;
revoke all on function public.submit_system_check(jsonb) from anon, authenticated;
grant execute on function public.submit_system_check(jsonb) to service_role;
