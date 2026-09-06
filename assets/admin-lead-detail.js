import {
  requireAdmin,
  logoutAdmin,
  formatDate,
  formatDateInput,
  escapeHtml,
  showError,
  ENGAGEMENT_STATUSES,
  LEAD_SOURCES,
  DIMENSIONS,
  DIM_LABELS,
  DO_NOT_ASSUME
} from './admin-core.js';
import {
  QUESTIONS,
  questionById,
  responseWording,
  formatInternalValue
} from './admin-methodology.js';

function submissionIdFromPath() {
  const parts = window.location.pathname.replace(/\/+$/, '').split('/');
  // /admin/leads/:id
  const idx = parts.indexOf('leads');
  if (idx === -1 || !parts[idx + 1] || parts[idx + 1] === 'detail') return null;
  return decodeURIComponent(parts[idx + 1]);
}

function indexLabel(value) {
  if (value == null || value === '') return 'null / not scored';
  const n = Number(value);
  if (Number.isNaN(n)) return 'null / not scored';
  return n.toFixed(2);
}

function consentLabel(contact) {
  if (!contact) return 'Not provided';
  if (contact.marketing_consent === true) {
    return 'Consented' + (contact.marketing_consent_at
      ? ' (' + formatDate(contact.marketing_consent_at) + ')'
      : '');
  }
  return 'Not consented';
}

async function ensureCase(supabase, submissionId) {
  const { data: existing, error: readErr } = await supabase
    .from('consultancy_cases')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from('consultancy_cases')
    .insert({ submission_id: submissionId, engagement_status: 'New' })
    .select('*')
    .single();
  if (insertErr) throw insertErr;
  return created;
}

async function loadDetail(ctx, submissionId) {
  const { data: submission, error } = await ctx.supabase
    .from('system_check_submissions')
    .select(`
      *,
      contacts (*)
    `)
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw error;
  if (!submission) throw new Error('not_found');

  const [responsesRes, patternsRes, questionsRes, caseRow] = await Promise.all([
    ctx.supabase
      .from('system_check_responses')
      .select('*')
      .eq('submission_id', submissionId),
    ctx.supabase
      .from('system_check_patterns')
      .select('*')
      .eq('submission_id', submissionId)
      .order('priority', { ascending: false }),
    ctx.supabase
      .from('system_check_priority_questions')
      .select('*')
      .eq('submission_id', submissionId)
      .order('question_order', { ascending: true }),
    ensureCase(ctx.supabase, submissionId)
  ]);

  if (responsesRes.error) throw responsesRes.error;
  if (patternsRes.error) throw patternsRes.error;
  if (questionsRes.error) throw questionsRes.error;

  return {
    submission: submission,
    contact: submission.contacts || {},
    responses: responsesRes.data || [],
    patterns: patternsRes.data || [],
    priorityQuestions: questionsRes.data || [],
    caseRow: caseRow
  };
}

function findResponse(responses, questionId) {
  return responses.find(function (r) { return r.question_id === questionId; }) || null;
}

function findContext(responses) {
  const ctx = responses.find(function (r) {
    return r.question_id === 'CTX-01';
  });
  if (ctx && ctx.raw_text) return ctx.raw_text;
  return '';
}

function renderContact(contact, submission) {
  const el = document.getElementById('section-contact');
  const rows = [
    ['First name', contact.first_name || '—'],
    ['Last name', contact.last_name || '—'],
    ['Work email', contact.work_email || '—'],
    ['Organisation', contact.organisation || '—'],
    ['Role', contact.role || '—'],
    ['Sector', contact.sector || '—'],
    ['Completed', formatDate(submission.created_at)],
    ['System Check version', submission.submission_version || '—'],
    ['Marketing consent', consentLabel(contact)]
  ];
  el.innerHTML = '<div class="grid-2">' + rows.map(function (pair) {
    return (
      '<div><div class="muted" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase">' +
      escapeHtml(pair[0]) +
      '</div><div style="margin-top:4px">' + escapeHtml(pair[1]) + '</div></div>'
    );
  }).join('') + '</div>';
}

function renderHeadline(text) {
  const el = document.getElementById('section-headline');
  if (!text || !String(text).trim()) {
    el.innerHTML = '<p class="empty">No contextual response provided.</p>';
    return;
  }
  el.innerHTML =
    '<p class="muted" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px">What they want to understand</p>' +
    '<p style="margin:0;white-space:pre-wrap">' + escapeHtml(text) + '</p>';
}

function renderSnapshot(submission) {
  const el = document.getElementById('section-snapshot');
  el.innerHTML = '<div class="dim-grid">' + DIMENSIONS.map(function (dim) {
    const status = submission[dim + '_status'] || '—';
    const confidence = submission[dim + '_confidence'] || '—';
    const index = submission[dim + '_index'];
    return (
      '<div class="dim-card">' +
        '<div class="name">' + escapeHtml(DIM_LABELS[dim]) + '</div>' +
        '<div class="status">' + escapeHtml(status) + '</div>' +
        '<div class="meta">Confidence: ' + escapeHtml(confidence) + '</div>' +
        '<div class="meta">Internal index: ' + escapeHtml(indexLabel(index)) + '</div>' +
      '</div>'
    );
  }).join('') + '</div>' +
  '<p class="muted" style="margin:14px 0 0;font-size:13px">Internal index values are methodology data for consultants. They are not shown to participants.</p>';
}

function renderResponses(responses) {
  const el = document.getElementById('section-responses');
  el.innerHTML = QUESTIONS.map(function (q) {
    const r = findResponse(responses, q.id);
    const code = r ? r.response_code : null;
    const wording = code === 'E' || (!code && r && r.response_value == null)
      ? 'Unsure'
      : responseWording(q.id, code);
    const internal = formatInternalValue(code, r ? r.response_value : null);
    return (
      '<div class="response-item">' +
        '<div class="qid">' + escapeHtml(q.id) + '</div>' +
        '<div class="q">' + escapeHtml(q.text) + '</div>' +
        '<div class="a">Response code: <strong>' + escapeHtml(code === 'E' ? 'E (Unsure)' : (code || '—')) + '</strong></div>' +
        '<div class="a">Response wording: ' + escapeHtml(wording) + '</div>' +
        '<div class="a">Internal numeric value: ' + escapeHtml(internal) + '</div>' +
      '</div>'
    );
  }).join('');
}

function renderPatterns(patterns) {
  const el = document.getElementById('section-patterns');
  if (!patterns.length) {
    el.innerHTML = '<p class="empty">No patterns detected for this submission.</p>';
    return;
  }
  el.innerHTML = patterns.map(function (p) {
    return (
      '<div class="pattern-item">' +
        '<div class="qid">' + escapeHtml(p.pattern_id) + ' · Priority ' + escapeHtml(String(p.priority == null ? '—' : p.priority)) + '</div>' +
        '<div class="q">' + escapeHtml(p.pattern_name) + '</div>' +
        '<div class="a">' + escapeHtml(p.generated_question || '—') + '</div>' +
      '</div>'
    );
  }).join('') +
  '<p class="muted" style="margin-top:12px;font-size:13px">Detected patterns indicate areas for discovery conversation. They are not proof of organisational dysfunction.</p>';
}

function renderPriority(questions) {
  const el = document.getElementById('section-priority');
  if (!questions.length) {
    el.innerHTML = '<p class="empty">No priority questions stored for this submission.</p>';
    return;
  }
  el.innerHTML = questions.map(function (q) {
    return (
      '<div class="priority-item">' +
        '<div class="n">' + escapeHtml(String(q.question_order)) + '</div>' +
        '<div>' + escapeHtml(q.question_text) + '</div>' +
      '</div>'
    );
  }).join('');
}

function renderBrief(bundle) {
  const el = document.getElementById('section-brief');
  const c = bundle.contact;
  const s = bundle.submission;
  const headline = findContext(bundle.responses);
  const dims = DIMENSIONS.map(function (dim) {
    return DIM_LABELS[dim] + ': ' + (s[dim + '_status'] || '—') +
      ' (confidence ' + (s[dim + '_confidence'] || '—') + ')';
  });
  const patterns = bundle.patterns.length
    ? bundle.patterns.map(function (p) {
      return p.pattern_id + ' — ' + p.pattern_name;
    })
    : ['None detected'];
  const questions = bundle.priorityQuestions.length
    ? bundle.priorityQuestions.map(function (q) {
      return q.question_order + '. ' + q.question_text;
    })
    : ['None stored'];

  el.innerHTML =
    '<div class="brief-block"><h3>Contact</h3><p>' +
      escapeHtml(((c.first_name || '') + ' ' + (c.last_name || '')).trim() || '—') +
      '<br>' + escapeHtml(c.work_email || '—') +
    '</p></div>' +
    '<div class="brief-block"><h3>Organisation</h3><p>' + escapeHtml(c.organisation || '—') + '</p></div>' +
    '<div class="brief-block"><h3>Role</h3><p>' + escapeHtml(c.role || '—') + '</p></div>' +
    '<div class="brief-block"><h3>Sector</h3><p>' + escapeHtml(c.sector || '—') + '</p></div>' +
    '<div class="brief-block"><h3>Completion date</h3><p>' + escapeHtml(formatDate(s.created_at)) + '</p></div>' +
    '<div class="brief-block"><h3>System Check version</h3><p>' + escapeHtml(s.submission_version || '—') + '</p></div>' +
    '<div class="brief-block"><h3>What they want to understand</h3><p style="white-space:pre-wrap">' +
      escapeHtml(headline || 'No contextual response provided.') + '</p></div>' +
    '<div class="brief-block"><h3>System interpretation</h3><ul>' +
      dims.map(function (d) { return '<li>' + escapeHtml(d) + '</li>'; }).join('') +
    '</ul></div>' +
    '<div class="brief-block"><h3>Detected patterns</h3><ul>' +
      patterns.map(function (d) { return '<li>' + escapeHtml(d) + '</li>'; }).join('') +
    '</ul></div>' +
    '<div class="brief-block"><h3>Three priority questions</h3><ul>' +
      questions.map(function (d) { return '<li>' + escapeHtml(d) + '</li>'; }).join('') +
    '</ul></div>' +
    '<div class="brief-block"><h3>Do not assume</h3><ul>' +
      DO_NOT_ASSUME.map(function (d) { return '<li>' + escapeHtml(d) + '</li>'; }).join('') +
    '</ul></div>';
}

function populateWorkspace(caseRow) {
  const statusSel = document.getElementById('field-status');
  const sourceSel = document.getElementById('field-source');
  statusSel.innerHTML = '';
  ENGAGEMENT_STATUSES.forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusSel.appendChild(opt);
  });
  sourceSel.innerHTML = '<option value="">Unknown</option>';
  LEAD_SOURCES.forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sourceSel.appendChild(opt);
  });

  statusSel.value = caseRow.engagement_status || 'New';
  sourceSel.value = caseRow.lead_source || '';
  document.getElementById('field-notes').value = caseRow.internal_notes || '';
  document.getElementById('field-next').value = caseRow.next_action || '';
  document.getElementById('field-followup').value = formatDateInput(caseRow.follow_up_date);
}

function wireDirtyGuard() {
  let dirty = false;
  const form = document.getElementById('workspace-form');
  form.addEventListener('input', function () { dirty = true; });
  form.addEventListener('change', function () { dirty = true; });
  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
  form.addEventListener('submit', function () { dirty = false; });
  return {
    markClean: function () { dirty = false; }
  };
}

document.getElementById('logout-btn').addEventListener('click', function () {
  logoutAdmin();
});

requireAdmin().then(async function (ctx) {
  if (!ctx) return;
  const submissionId = submissionIdFromPath();
  if (!submissionId) {
    showError(document.getElementById('admin-error'), 'Unable to load this lead. Please try again.');
    return;
  }

  let bundle;
  try {
    bundle = await loadDetail(ctx, submissionId);
  } catch (e) {
    const msg = e && e.message === 'not_found'
      ? 'This lead could not be found.'
      : 'Unable to load this lead. Please try again.';
    showError(document.getElementById('admin-error'), msg);
    return;
  }

  document.title = (bundle.contact.organisation || 'Lead') + ' | NORDR Admin';
  document.getElementById('lead-title').textContent = bundle.contact.organisation || 'Lead detail';
  document.getElementById('lead-sub').textContent =
    ((bundle.contact.first_name || '') + ' ' + (bundle.contact.last_name || '')).trim() +
    (bundle.contact.sector ? ' · ' + bundle.contact.sector : '');

  renderContact(bundle.contact, bundle.submission);
  renderHeadline(findContext(bundle.responses));
  renderSnapshot(bundle.submission);
  renderResponses(bundle.responses);
  renderPatterns(bundle.patterns);
  renderPriority(bundle.priorityQuestions);
  renderBrief(bundle);
  populateWorkspace(bundle.caseRow);
  document.getElementById('admin-error').hidden = true;
  document.getElementById('admin-content').hidden = false;

  const dirty = wireDirtyGuard();
  const flash = document.getElementById('workspace-flash');

  document.getElementById('workspace-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    flash.hidden = true;
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    const payload = {
      engagement_status: document.getElementById('field-status').value,
      internal_notes: document.getElementById('field-notes').value.trim() || null,
      next_action: document.getElementById('field-next').value.trim() || null,
      follow_up_date: document.getElementById('field-followup').value || null,
      lead_source: document.getElementById('field-source').value || null
    };

    try {
      const { error } = await ctx.supabase
        .from('consultancy_cases')
        .update(payload)
        .eq('id', bundle.caseRow.id);
      if (error) throw error;
      Object.assign(bundle.caseRow, payload);
      dirty.markClean();
      flash.className = 'flash ok';
      flash.textContent = 'Saved.';
      flash.hidden = false;
    } catch (err) {
      flash.className = 'flash';
      flash.textContent = 'Unable to save changes. Please try again.';
      flash.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}).catch(function () {
  showError(document.getElementById('admin-error'), 'Unable to load this lead. Please try again.');
});

void questionById;
