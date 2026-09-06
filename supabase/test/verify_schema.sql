-- Schema verification queries for NORDR System Check.
-- Run after applying 002_create_nordr_system_check.sql.
-- Read-only checks — safe to run in production.

-- 1) Tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'contacts',
    'system_check_submissions',
    'system_check_responses',
    'system_check_patterns',
    'system_check_priority_questions'
  )
order by table_name;

-- 2) RLS enabled
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
  'contacts',
  'system_check_submissions',
  'system_check_responses',
  'system_check_patterns',
  'system_check_priority_questions'
)
order by relname;

-- 3) No permissive policies for anon/authenticated (expect zero rows)
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'contacts',
    'system_check_submissions',
    'system_check_responses',
    'system_check_patterns',
    'system_check_priority_questions'
  );

-- 4) Key indexes
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'contacts_work_email_lower_uidx',
    'contacts_organisation_idx',
    'system_check_submissions_contact_id_idx',
    'system_check_submissions_created_at_idx',
    'system_check_responses_submission_id_idx',
    'system_check_patterns_submission_id_idx',
    'system_check_priority_questions_submission_id_idx'
  )
order by indexname;

-- 5) Functions exist
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('create_system_check_submission', 'submit_system_check', 'set_updated_at')
order by proname;

-- 6) Contact FK does not cascade-delete submissions
select
  tc.constraint_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
where tc.table_name = 'system_check_submissions'
  and tc.constraint_type = 'FOREIGN KEY';

-- 7) Child tables cascade on submission delete
select
  tc.table_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
where tc.table_name in (
    'system_check_responses',
    'system_check_patterns',
    'system_check_priority_questions'
  )
  and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name;
