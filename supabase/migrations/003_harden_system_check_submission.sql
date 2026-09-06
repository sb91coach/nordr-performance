-- Harden System Check submission function + refresh PostgREST schema cache.
-- Run in Supabase SQL Editor after 002 if live submissions are failing.

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
      first_name, last_name, work_email, organisation, role, sector,
      marketing_consent, marketing_consent_at, privacy_notice_version
    ) values (
      trim(v_contact->>'first_name'),
      trim(v_contact->>'last_name'),
      v_email,
      trim(v_contact->>'organisation'),
      nullif(trim(coalesce(v_contact->>'role', '')), ''),
      nullif(trim(coalesce(v_contact->>'sector', '')), ''),
      v_marketing,
      case
        when v_marketing then coalesce((v_contact->>'marketing_consent_at')::timestamptz, now())
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
        when v_marketing then coalesce((v_contact->>'marketing_consent_at')::timestamptz, marketing_consent_at, now())
        else null
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
    case when jsonb_typeof(v_submission->'objective_index') = 'number' then (v_submission->>'objective_index')::numeric else null end,
    case when jsonb_typeof(v_submission->'system_index') = 'number' then (v_submission->>'system_index')::numeric else null end,
    case when jsonb_typeof(v_submission->'human_index') = 'number' then (v_submission->>'human_index')::numeric else null end,
    case when jsonb_typeof(v_submission->'evidence_index') = 'number' then (v_submission->>'evidence_index')::numeric else null end,
    case when jsonb_typeof(v_submission->'decision_index') = 'number' then (v_submission->>'decision_index')::numeric else null end,
    case when jsonb_typeof(v_submission->'outcome_index') = 'number' then (v_submission->>'outcome_index')::numeric else null end,
    nullif(v_submission->>'objective_status', ''),
    nullif(v_submission->>'system_status', ''),
    nullif(v_submission->>'human_status', ''),
    nullif(v_submission->>'evidence_status', ''),
    nullif(v_submission->>'decision_status', ''),
    nullif(v_submission->>'outcome_status', ''),
    nullif(v_submission->>'objective_confidence', ''),
    nullif(v_submission->>'system_confidence', ''),
    nullif(v_submission->>'human_confidence', ''),
    nullif(v_submission->>'evidence_confidence', ''),
    nullif(v_submission->>'decision_confidence', ''),
    nullif(v_submission->>'outcome_confidence', '')
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
      case when jsonb_typeof(v_item->'response_value') = 'number' then (v_item->>'response_value')::numeric else null end,
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
      case when jsonb_typeof(v_item->'priority') = 'number' then (v_item->>'priority')::integer else null end,
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

revoke all on function public.create_system_check_submission(jsonb) from public;
revoke all on function public.create_system_check_submission(jsonb) from anon, authenticated;
grant execute on function public.create_system_check_submission(jsonb) to service_role;

revoke all on function public.submit_system_check(jsonb) from public;
revoke all on function public.submit_system_check(jsonb) from anon, authenticated;
grant execute on function public.submit_system_check(jsonb) to service_role;

notify pgrst, 'reload schema';
