-- NORDR Performance — System Check storage schema (v2)
-- Migration: 002_create_nordr_system_check.sql
--
-- Run in Supabase SQL Editor (SQL → New query → paste → Run)
-- or via the Supabase CLI migrations workflow.
--
-- Safe to re-run where practical (IF NOT EXISTS / OR REPLACE).
-- Does not contain API keys or database credentials.
--
-- Data model principles:
-- - One contact can have many submissions (historical submissions are preserved).
-- - One submission has many responses; raw answers are retained even if
--   interpretation methodology changes later.
-- - Unsure is stored as null numeric response_value — never zero.
-- - Public/anon clients have no RLS policies granting read or write access.
-- - Server-side service_role bypasses RLS for controlled writes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. contacts
-- Represents organisations' people who complete a System Check.
-- Organisation is stored on the contact for v1 (no separate organisations table).
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  work_email text not null,
  organisation text not null,
  role text null,
  sector text null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz null,
  privacy_notice_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contacts is
  'People who complete the NORDR System Check. One contact may have many submissions over time.';

comment on column public.contacts.work_email is
  'Stored lowercase. Unique per contact via index on lower(work_email).';

comment on column public.contacts.marketing_consent is
  'Optional marketing opt-in. Completing the System Check alone must never imply consent.';

-- Upgrade path if 001 already created contacts without updated_at
alter table public.contacts
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists contacts_work_email_lower_uidx
  on public.contacts (lower(work_email));

create index if not exists contacts_organisation_idx
  on public.contacts (organisation);

create index if not exists contacts_created_at_idx
  on public.contacts (created_at desc);

-- Drop and recreate check constraints idempotently
alter table public.contacts drop constraint if exists contacts_sector_check;
alter table public.contacts
  add constraint contacts_sector_check
  check (
    sector is null
    or sector in (
      'Emergency Services',
      'Defence',
      'Aviation/Aerospace',
      'Motorsport',
      'High Performance Sport',
      'Corporate/Executive',
      'Industrial/High Risk',
      'Other'
    )
  );

alter table public.contacts drop constraint if exists contacts_marketing_consent_at_check;
alter table public.contacts
  add constraint contacts_marketing_consent_at_check
  check (marketing_consent = true or marketing_consent_at is null);

-- ---------------------------------------------------------------------------
-- 2. system_check_submissions
-- Snapshot of dimension interpretation for one completed assessment.
-- Historical rows must never be overwritten when methodology versions change.
-- ---------------------------------------------------------------------------

create table if not exists public.system_check_submissions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id),
  submission_version text not null,
  headline_question text null,
  objective_index numeric null,
  system_index numeric null,
  human_index numeric null,
  evidence_index numeric null,
  decision_index numeric null,
  outcome_index numeric null,
  objective_status text null,
  system_status text null,
  human_status text null,
  evidence_status text null,
  decision_status text null,
  outcome_status text null,
  objective_confidence text null,
  system_confidence text null,
  human_confidence text null,
  evidence_confidence text null,
  decision_confidence text null,
  outcome_confidence text null,
  created_at timestamptz not null default now()
);

comment on table public.system_check_submissions is
  'One row per completed System Check. Preserved independently so change over time can be examined.';

comment on column public.system_check_submissions.objective_index is
  'Mean of answered Objective items only. Null when both responses are Unsure. Unsure never equals zero.';

-- No ON DELETE CASCADE from contacts: deleting a contact must not casually erase history.
-- Postgres default is NO ACTION / RESTRICT when submissions still reference the contact.

create index if not exists system_check_submissions_contact_id_idx
  on public.system_check_submissions (contact_id);

create index if not exists system_check_submissions_created_at_idx
  on public.system_check_submissions (created_at desc);

do $$
declare
  col text;
  status_cols text[] := array[
    'objective_status','system_status','human_status',
    'evidence_status','decision_status','outcome_status'
  ];
  conf_cols text[] := array[
    'objective_confidence','system_confidence','human_confidence',
    'evidence_confidence','decision_confidence','outcome_confidence'
  ];
begin
  foreach col in array status_cols loop
    execute format('alter table public.system_check_submissions drop constraint if exists system_check_submissions_%s_check', col);
    execute format(
      'alter table public.system_check_submissions add constraint system_check_submissions_%s_check check (%I is null or %I in (%L, %L, %L, %L, %L))',
      col, col, col,
      'Established', 'Developing', 'Requires Exploration', 'Limited Visibility', 'Not Established'
    );
  end loop;

  foreach col in array conf_cols loop
    execute format('alter table public.system_check_submissions drop constraint if exists system_check_submissions_%s_check', col);
    execute format(
      'alter table public.system_check_submissions add constraint system_check_submissions_%s_check check (%I is null or %I in (%L, %L))',
      col, col, col, 'High', 'Limited'
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. system_check_responses
-- Raw participant answers. Retained so later methodology versions do not
-- rewrite historical participant input.
-- ---------------------------------------------------------------------------

create table if not exists public.system_check_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  question_id text not null,
  response_code text null,
  response_value numeric null,
  raw_text text null,
  created_at timestamptz not null default now()
);

comment on table public.system_check_responses is
  'Raw System Check answers. Scored items use response_code A–E; contextual free text uses raw_text with null code/value.';

comment on column public.system_check_responses.response_value is
  'Mapped score A=4 B=3 C=2 D=1; E/Unsure is null (never zero).';

create index if not exists system_check_responses_submission_id_idx
  on public.system_check_responses (submission_id);

alter table public.system_check_responses drop constraint if exists system_check_responses_submission_question_uidx;
alter table public.system_check_responses drop constraint if exists system_check_responses_submission_id_question_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'system_check_responses_submission_question_key'
      and conrelid = 'public.system_check_responses'::regclass
  ) then
    alter table public.system_check_responses
      add constraint system_check_responses_submission_question_key
      unique (submission_id, question_id);
  end if;
end $$;

alter table public.system_check_responses drop constraint if exists system_check_responses_response_code_check;
alter table public.system_check_responses
  add constraint system_check_responses_response_code_check
  check (response_code is null or response_code in ('A', 'B', 'C', 'D', 'E'));

-- ---------------------------------------------------------------------------
-- 4. system_check_patterns
-- Deterministic relationship patterns detected for a submission.
-- ---------------------------------------------------------------------------

create table if not exists public.system_check_patterns (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  pattern_id text not null,
  pattern_name text not null,
  priority integer null,
  generated_question text null,
  created_at timestamptz not null default now()
);

comment on table public.system_check_patterns is
  'Detected NORDR patterns (PAT-01…PAT-10) for a single submission snapshot.';

create index if not exists system_check_patterns_submission_id_idx
  on public.system_check_patterns (submission_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'system_check_patterns_submission_pattern_key'
      and conrelid = 'public.system_check_patterns'::regclass
  ) then
    alter table public.system_check_patterns
      add constraint system_check_patterns_submission_pattern_key
      unique (submission_id, pattern_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. system_check_priority_questions
-- Exactly three non-duplicative investigation questions per submission.
-- ---------------------------------------------------------------------------

create table if not exists public.system_check_priority_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.system_check_submissions(id) on delete cascade,
  question_order integer not null,
  question_text text not null,
  source_type text null,
  source_id text null,
  created_at timestamptz not null default now()
);

comment on table public.system_check_priority_questions is
  'Three priority investigation questions generated for a submission (question_order 1–3).';

create index if not exists system_check_priority_questions_submission_id_idx
  on public.system_check_priority_questions (submission_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'system_check_priority_questions_submission_order_key'
      and conrelid = 'public.system_check_priority_questions'::regclass
  ) then
    alter table public.system_check_priority_questions
      add constraint system_check_priority_questions_submission_order_key
      unique (submission_id, question_order);
  end if;
end $$;

alter table public.system_check_priority_questions drop constraint if exists system_check_priority_questions_order_check;
alter table public.system_check_priority_questions
  add constraint system_check_priority_questions_order_check
  check (question_order between 1 and 3);

-- ---------------------------------------------------------------------------
-- 8. updated_at trigger for contacts
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Reusable trigger function that sets updated_at = now() on row update.';

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Row Level Security
-- Intentionally restrictive: no anon/authenticated policies for public read/write.
-- Service role (Vercel API) bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.contacts enable row level security;
alter table public.system_check_submissions enable row level security;
alter table public.system_check_responses enable row level security;
alter table public.system_check_patterns enable row level security;
alter table public.system_check_priority_questions enable row level security;

comment on table public.contacts is
  'People who complete the NORDR System Check. One contact may have many submissions over time. RLS enabled with no public policies.';

revoke all on table public.contacts from anon, authenticated;
revoke all on table public.system_check_submissions from anon, authenticated;
revoke all on table public.system_check_responses from anon, authenticated;
revoke all on table public.system_check_patterns from anon, authenticated;
revoke all on table public.system_check_priority_questions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. Atomic submission function
-- ---------------------------------------------------------------------------

create or replace function public.create_system_check_submission(payload jsonb)
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
  v_priority_count integer;
begin
  if v_contact is null or v_submission is null or v_responses is null then
    raise exception 'Invalid submission payload';
  end if;

  v_priority_count := jsonb_array_length(v_priority_questions);
  if v_priority_count <> 3 then
    raise exception 'Exactly three priority questions are required';
  end if;

  -- Normalise work email to lowercase before storage / matching
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
      nullif(trim(coalesce(v_contact->>'role', '')), ''),
      nullif(trim(coalesce(v_contact->>'sector', '')), ''),
      v_marketing,
      case
        when v_marketing then coalesce(nullif(v_contact->>'marketing_consent_at', '')::timestamptz, now())
        else null
      end,
      trim(v_contact->>'privacy_notice_version')
    )
    returning id into v_contact_id;
  else
    update public.contacts
    set
      first_name = trim(v_contact->>'first_name'),
      last_name = trim(v_contact->>'last_name'),
      organisation = trim(v_contact->>'organisation'),
      role = nullif(trim(coalesce(v_contact->>'role', '')), ''),
      sector = nullif(trim(coalesce(v_contact->>'sector', '')), ''),
      privacy_notice_version = trim(v_contact->>'privacy_notice_version'),
      marketing_consent = v_marketing,
      marketing_consent_at = case
        when v_marketing then coalesce(nullif(v_contact->>'marketing_consent_at', '')::timestamptz, marketing_consent_at, now())
        else null
      end
    where id = v_contact_id;
  end if;

  -- Always insert a NEW submission row — never overwrite historical submissions
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
      nullif(v_item->>'response_code', ''),
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

comment on function public.create_system_check_submission(jsonb) is
  'Atomically upserts contact by lowercase email and inserts a new System Check submission with responses, patterns and three priority questions.';

revoke all on function public.create_system_check_submission(jsonb) from public;
revoke all on function public.create_system_check_submission(jsonb) from anon, authenticated;
grant execute on function public.create_system_check_submission(jsonb) to service_role;

-- Compatibility wrapper for earlier API versions
create or replace function public.submit_system_check(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_system_check_submission(payload);
end;
$$;

revoke all on function public.submit_system_check(jsonb) from public;
revoke all on function public.submit_system_check(jsonb) from anon, authenticated;
grant execute on function public.submit_system_check(jsonb) to service_role;
