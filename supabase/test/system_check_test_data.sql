-- OPTIONAL synthetic test data for NORDR System Check schema.
-- Do NOT run automatically against production.
-- Use only in a development / staging Supabase project if you need sample rows.
--
-- Clear with care: this uses a dedicated test email only.

-- Example contact + one submission via the atomic function
select public.create_system_check_submission(
  jsonb_build_object(
    'contact', jsonb_build_object(
      'first_name', 'Test',
      'last_name', 'User',
      'work_email', 'test@example.com',
      'organisation', 'NORDR TEST ORGANISATION',
      'role', 'Test Role',
      'sector', 'Other',
      'marketing_consent', false,
      'privacy_notice_version', '2026-09-v1'
    ),
    'submission', jsonb_build_object(
      'submission_version', 'system-check-v1',
      'headline_question', 'How clearly can you connect your Human Performance activity to the outcomes that matter?',
      'objective_index', 3.5,
      'system_index', 3.0,
      'human_index', 2.5,
      'evidence_index', 2.0,
      'decision_index', 2.5,
      'outcome_index', 1.5,
      'objective_status', 'Established',
      'system_status', 'Developing',
      'human_status', 'Requires Exploration',
      'evidence_status', 'Requires Exploration',
      'decision_status', 'Requires Exploration',
      'outcome_status', 'Limited Visibility',
      'objective_confidence', 'High',
      'system_confidence', 'High',
      'human_confidence', 'High',
      'evidence_confidence', 'High',
      'decision_confidence', 'High',
      'outcome_confidence', 'High'
    ),
    'responses', jsonb_build_array(
      jsonb_build_object('question_id', 'OBJ-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'OBJ-02', 'response_code', 'B', 'response_value', 3),
      jsonb_build_object('question_id', 'SYS-01', 'response_code', 'B', 'response_value', 3),
      jsonb_build_object('question_id', 'SYS-02', 'response_code', 'B', 'response_value', 3),
      jsonb_build_object('question_id', 'HUM-01', 'response_code', 'C', 'response_value', 2),
      jsonb_build_object('question_id', 'HUM-02', 'response_code', 'B', 'response_value', 3),
      jsonb_build_object('question_id', 'EVD-01', 'response_code', 'C', 'response_value', 2),
      jsonb_build_object('question_id', 'EVD-02', 'response_code', 'C', 'response_value', 2),
      jsonb_build_object('question_id', 'DEC-01', 'response_code', 'C', 'response_value', 2),
      jsonb_build_object('question_id', 'DEC-02', 'response_code', 'B', 'response_value', 3),
      jsonb_build_object('question_id', 'OUT-01', 'response_code', 'D', 'response_value', 1),
      jsonb_build_object('question_id', 'OUT-02', 'response_code', 'D', 'response_value', 1),
      jsonb_build_object('question_id', 'CTX-01', 'response_code', null, 'response_value', null, 'raw_text', 'Synthetic context note for testing only.')
    ),
    'patterns', jsonb_build_array(
      jsonb_build_object(
        'pattern_id', 'PAT-10',
        'pattern_name', 'Incomplete Feedback Loop',
        'priority', 40,
        'generated_question', 'How does the organisation determine whether a Human Performance decision produced the intended effect, and how does that learning influence what happens next?'
      )
    ),
    'priority_questions', jsonb_build_array(
      jsonb_build_object('question_order', 1, 'question_text', 'Test priority question one', 'source_type', 'pattern', 'source_id', 'PAT-10'),
      jsonb_build_object('question_order', 2, 'question_text', 'Test priority question two', 'source_type', 'fallback', 'source_id', 'fallback-0'),
      jsonb_build_object('question_order', 3, 'question_text', 'Test priority question three', 'source_type', 'fallback', 'source_id', 'fallback-1')
    )
  )
);

-- Second submission for the same contact (duplicate email, new submission)
select public.create_system_check_submission(
  jsonb_build_object(
    'contact', jsonb_build_object(
      'first_name', 'Test',
      'last_name', 'User',
      'work_email', 'Test@Example.com',
      'organisation', 'NORDR TEST ORGANISATION',
      'role', 'Test Role',
      'sector', 'Other',
      'marketing_consent', false,
      'privacy_notice_version', '2026-09-v1'
    ),
    'submission', jsonb_build_object(
      'submission_version', 'system-check-v1',
      'headline_question', 'How clearly can you connect your Human Performance activity to the outcomes that matter?',
      'objective_index', 4,
      'system_index', 4,
      'human_index', 4,
      'evidence_index', 4,
      'decision_index', 4,
      'outcome_index', 4,
      'objective_status', 'Established',
      'system_status', 'Established',
      'human_status', 'Established',
      'evidence_status', 'Established',
      'decision_status', 'Established',
      'outcome_status', 'Established',
      'objective_confidence', 'High',
      'system_confidence', 'High',
      'human_confidence', 'High',
      'evidence_confidence', 'High',
      'decision_confidence', 'High',
      'outcome_confidence', 'High'
    ),
    'responses', jsonb_build_array(
      jsonb_build_object('question_id', 'OBJ-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'OBJ-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'SYS-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'SYS-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'HUM-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'HUM-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'EVD-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'EVD-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'DEC-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'DEC-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'OUT-01', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'OUT-02', 'response_code', 'A', 'response_value', 4),
      jsonb_build_object('question_id', 'CTX-01', 'raw_text', 'Second synthetic submission.')
    ),
    'patterns', '[]'::jsonb,
    'priority_questions', jsonb_build_array(
      jsonb_build_object('question_order', 1, 'question_text', 'Second submission priority one', 'source_type', 'headline', 'source_id', 'headline'),
      jsonb_build_object('question_order', 2, 'question_text', 'Second submission priority two', 'source_type', 'fallback', 'source_id', 'fallback-0'),
      jsonb_build_object('question_order', 3, 'question_text', 'Second submission priority three', 'source_type', 'fallback', 'source_id', 'fallback-1')
    )
  )
);

-- Manual checks after running (inspect in Table Editor or SQL):
-- select count(*) from contacts where lower(work_email) = 'test@example.com';  -- expect 1
-- select count(*) from system_check_submissions s
--   join contacts c on c.id = s.contact_id
--  where lower(c.work_email) = 'test@example.com';  -- expect 2
