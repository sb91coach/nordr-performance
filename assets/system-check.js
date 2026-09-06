(function () {
  'use strict';

  var STORAGE_KEY = 'nordrSystemCheckV1';
  var SUBMIT_URL = '/api/system-check/submit';

  var DIMENSIONS = ['objective', 'system', 'human', 'evidence', 'decision', 'outcome'];
  var DIM_LABELS = {
    objective: 'Objective',
    system: 'System',
    human: 'Human',
    evidence: 'Evidence',
    decision: 'Decision',
    outcome: 'Outcome'
  };

  var SCORE_MAP = { A: 4, B: 3, C: 2, D: 1, E: null };

  var SECTORS = [
    'Emergency Services',
    'Defence',
    'Aviation/Aerospace',
    'Motorsport',
    'High Performance Sport',
    'Corporate/Executive',
    'Industrial/High Risk',
    'Other'
  ];

  var QUESTIONS = [
    {
      id: 'OBJ-01',
      dimension: 'objective',
      text: 'How clearly is the primary outcome your Human Performance provision exists to support defined?',
      options: [
        { key: 'A', label: 'Clearly defined and consistently understood' },
        { key: 'B', label: 'Defined, but interpreted differently across the organisation' },
        { key: 'C', label: 'Broadly understood but not formally defined' },
        { key: 'D', label: 'Currently unclear' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'OBJ-02',
      dimension: 'objective',
      text: 'How clearly can existing Human Performance activity be connected to that objective?',
      options: [
        { key: 'A', label: 'A clear connection across the system' },
        { key: 'B', label: 'Clear for some activities' },
        { key: 'C', label: 'Largely assumed' },
        { key: 'D', label: 'Difficult to establish' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'SYS-01',
      dimension: 'system',
      text: 'Could you currently map how the people, services and processes supporting Human Performance interact?',
      options: [
        { key: 'A', label: 'Yes, clearly' },
        { key: 'B', label: 'Mostly' },
        { key: 'C', label: 'Partially' },
        { key: 'D', label: 'Not currently' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'SYS-02',
      dimension: 'system',
      text: 'How clear are responsibilities, handovers and decision points across that system?',
      options: [
        { key: 'A', label: 'Clearly established' },
        { key: 'B', label: 'Mostly established' },
        { key: 'C', label: 'Variable' },
        { key: 'D', label: 'Largely unclear' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'HUM-01',
      dimension: 'human',
      text: 'How well does the organisation understand the factors enabling or constraining people from performing when required?',
      options: [
        { key: 'A', label: 'Strong understanding supported by evidence' },
        { key: 'B', label: 'Reasonable understanding' },
        { key: 'C', label: 'Some factors understood' },
        { key: 'D', label: 'Limited visibility' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'HUM-02',
      dimension: 'human',
      text: 'How effectively can the experiences and perspectives of people operating within the system inform Human Performance decisions?',
      options: [
        { key: 'A', label: 'Routinely and meaningfully' },
        { key: 'B', label: 'In some areas' },
        { key: 'C', label: 'Primarily informally' },
        { key: 'D', label: 'Rarely' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'EVD-01',
      dimension: 'evidence',
      text: 'What does current Human Performance information primarily tell you?',
      options: [
        { key: 'A', label: 'Outcomes and their relationship to activity' },
        { key: 'B', label: 'A mixture of outcomes and activity' },
        { key: 'C', label: 'Primarily activity and utilisation' },
        { key: 'D', label: 'Very limited information' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'EVD-02',
      dimension: 'evidence',
      text: 'When different sources provide different pictures, how effectively can the organisation investigate why?',
      options: [
        { key: 'A', label: 'Systematically' },
        { key: 'B', label: 'Usually' },
        { key: 'C', label: 'Sometimes' },
        { key: 'D', label: 'Rarely' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'DEC-01',
      dimension: 'decision',
      text: 'How effectively does relevant Human Performance information reach the people who need it to make decisions?',
      options: [
        { key: 'A', label: 'Consistently and at the right time' },
        { key: 'B', label: 'Usually' },
        { key: 'C', label: 'Variable' },
        { key: 'D', label: 'Often difficult' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'DEC-02',
      dimension: 'decision',
      text: 'When a Human Performance issue is identified, how clear is the route from insight to action?',
      options: [
        { key: 'A', label: 'Clear and established' },
        { key: 'B', label: 'Generally clear' },
        { key: 'C', label: 'Depends on the issue' },
        { key: 'D', label: 'Often unclear' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'OUT-01',
      dimension: 'outcome',
      text: 'When a change or intervention is implemented, how confidently can you determine whether it produced the intended outcome?',
      options: [
        { key: 'A', label: 'Consistently' },
        { key: 'B', label: 'In most cases' },
        { key: 'C', label: 'In some cases' },
        { key: 'D', label: 'Rarely' },
        { key: 'E', label: 'Unsure' }
      ]
    },
    {
      id: 'OUT-02',
      dimension: 'outcome',
      text: 'How effectively does learning from previous outcomes influence future Human Performance decisions?',
      options: [
        { key: 'A', label: 'Systematically' },
        { key: 'B', label: 'Regularly' },
        { key: 'C', label: 'Occasionally' },
        { key: 'D', label: 'Rarely' },
        { key: 'E', label: 'Unsure' }
      ]
    }
  ];

  var CONTEXT_PROMPT = 'If you could understand one thing about your current Human Performance system that you cannot confidently answer today, what would it be?';
  var CONTEXT_HINT = 'Please do not include personal medical information or identifying employee information.';

  var STATUS_COPY = {
    Established: 'Responses suggest a relatively clear picture in this area.',
    Developing: 'Responses suggest a developing picture, with room to strengthen shared understanding.',
    'Requires Exploration': 'Responses suggest this area may benefit from further exploration.',
    'Limited Visibility': 'Responses suggest limited current visibility in this area.',
    'Not Established': 'Insufficient responses were available to form a clear picture in this area.'
  };

  function defaultState() {
    return {
      step: 'intro',
      questionIndex: 0,
      answers: {},
      context: '',
      contact: {
        first_name: '',
        last_name: '',
        work_email: '',
        organisation: '',
        role: '',
        sector: '',
        marketing_consent: false
      },
      snapshot: null,
      submissionId: null,
      submitted: false,
      submitError: null,
      submitting: false
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      var state = Object.assign(base, parsed, {
        contact: Object.assign({}, base.contact, parsed.contact || {}),
        submitting: false
      });
      return state;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: state.step,
        questionIndex: state.questionIndex,
        answers: state.answers,
        context: state.context,
        contact: state.contact,
        snapshot: state.snapshot,
        submissionId: state.submissionId,
        submitted: state.submitted,
        submitError: state.submitError,
        submitting: !!state.submitting
      }));
    } catch (e) { /* ignore */ }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function el(id) { return document.getElementById(id); }

  function setState(patch) {
    var state = Object.assign(loadState(), patch);
    if (patch.contact) {
      state.contact = Object.assign({}, loadState().contact, patch.contact);
    }
    saveState(state);
    render();
  }

  function render() {
    var root = el('system-check-app');
    if (!root) return;
    var state = loadState();
    if (state.step === 'intro') renderIntro(root);
    else if (state.step === 'questions') renderQuestion(root, state);
    else if (state.step === 'context') renderContext(root, state);
    else if (state.step === 'details') renderDetails(root, state);
    else if (state.step === 'results') renderResults(root, state);
    else if (state.step === 'submit-error') renderSubmitError(root, state);
    else renderIntro(root);
  }

  function renderIntro(root) {
    root.innerHTML =
      '<section class="page-hero no-border section" style="border-top:none;padding-top:72px;">' +
        '<div class="wrap sc-shell">' +
          '<p class="eyebrow">Structured review</p>' +
          '<h1 style="font-size:clamp(32px,5vw,54px);">NORDR Human Performance System Check</h1>' +
          '<hr class="rule">' +
          '<p class="lede">How clearly can you connect your Human Performance activity to the outcomes that matter?</p>' +
          '<p>This is a short structured review designed to identify where the current picture appears relatively clear, where further understanding may be useful, and which questions may be worth investigating.</p>' +
          '<p>It does not determine whether an organisation or service is effective or ineffective.</p>' +
          '<p class="small">Approximately 5 to 7 minutes.</p>' +
          '<div class="sc-dim-pills" aria-label="Assessment dimensions">' +
            DIMENSIONS.map(function (d) { return '<span class="sc-dim-pill">' + DIM_LABELS[d] + '</span>'; }).join('') +
          '</div>' +
          '<div class="btn-row" style="margin-top:36px;">' +
            '<button type="button" class="btn btn-primary" id="sc-begin"><span>Begin System Check</span></button>' +
          '</div>' +
        '</div>' +
      '</section>';

    el('sc-begin').addEventListener('click', function () {
      setState({ step: 'questions', questionIndex: 0, snapshot: null, submitted: false, submitError: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function progressMeta(state) {
    var total = QUESTIONS.length + 2;
    var current;
    if (state.step === 'context') current = QUESTIONS.length + 1;
    else if (state.step === 'details' || state.step === 'submit-error') current = QUESTIONS.length + 2;
    else current = Math.min(state.questionIndex + 1, QUESTIONS.length);
    var pct = Math.round((current / total) * 100);
    return { current: current, total: total, pct: pct };
  }

  function renderQuestion(root, state) {
    var q = QUESTIONS[state.questionIndex];
    if (!q) {
      setState({ step: 'context' });
      return;
    }
    var prog = progressMeta(state);
    var selected = state.answers[q.id] || null;
    var dimIndex = DIMENSIONS.indexOf(q.dimension);

    root.innerHTML =
      '<section class="section no-border" style="padding-top:48px;">' +
        '<div class="wrap sc-shell">' +
          '<div class="sc-progress-wrap">' +
            '<div class="sc-progress-meta">' +
              '<span>Question ' + prog.current + ' of ' + prog.total + '</span>' +
              '<span>' + DIM_LABELS[q.dimension] + '</span>' +
            '</div>' +
            '<div class="sc-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + prog.pct + '" aria-label="Assessment progress">' +
              '<div class="sc-progress-fill" style="width:' + prog.pct + '%;"></div>' +
            '</div>' +
            '<div class="sc-dim-pills">' +
              DIMENSIONS.map(function (d, i) {
                var cls = 'sc-dim-pill';
                if (i === dimIndex) cls += ' is-current';
                else if (i < dimIndex) cls += ' is-done';
                return '<span class="' + cls + '">' + DIM_LABELS[d] + '</span>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="sc-card">' +
            '<div class="sc-q-id">' + q.id + '</div>' +
            '<h2 class="sc-q-text">' + escapeHtml(q.text) + '</h2>' +
            '<div class="sc-options" role="radiogroup" aria-label="' + escapeAttr(q.text) + '">' +
              q.options.map(function (opt) {
                var isSel = selected === opt.key;
                return '<button type="button" class="sc-option' + (isSel ? ' is-selected' : '') + '" role="radio" aria-checked="' + (isSel ? 'true' : 'false') + '" data-key="' + opt.key + '">' +
                  '<span class="letter">' + opt.key + '</span>' +
                  '<span class="text">' + escapeHtml(opt.label) + '</span>' +
                '</button>';
              }).join('') +
            '</div>' +
            '<div class="sc-nav">' +
              '<button type="button" class="btn btn-ghost" id="sc-back">' + (state.questionIndex === 0 ? 'Back to introduction' : 'Previous') + '</button>' +
              '<div class="btn-row">' +
                '<button type="button" class="btn btn-ghost no-print" id="sc-restart">Start again</button>' +
                '<button type="button" class="btn btn-primary" id="sc-next" ' + (selected ? '' : 'disabled') + '><span>Continue</span></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    root.querySelectorAll('.sc-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var answers = Object.assign({}, state.answers);
        answers[q.id] = btn.getAttribute('data-key');
        setState({ answers: answers });
      });
    });

    el('sc-back').addEventListener('click', function () {
      if (state.questionIndex === 0) setState({ step: 'intro' });
      else setState({ questionIndex: state.questionIndex - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el('sc-next').addEventListener('click', function () {
      if (!state.answers[q.id]) return;
      if (state.questionIndex >= QUESTIONS.length - 1) setState({ step: 'context' });
      else setState({ questionIndex: state.questionIndex + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    bindRestart('sc-restart');
  }

  function renderContext(root, state) {
    var prog = progressMeta(state);
    root.innerHTML =
      '<section class="section no-border" style="padding-top:48px;">' +
        '<div class="wrap sc-shell">' +
          '<div class="sc-progress-wrap">' +
            '<div class="sc-progress-meta">' +
              '<span>Question ' + prog.current + ' of ' + prog.total + '</span>' +
              '<span>Context</span>' +
            '</div>' +
            '<div class="sc-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + prog.pct + '" aria-label="Assessment progress">' +
              '<div class="sc-progress-fill" style="width:' + prog.pct + '%;"></div>' +
            '</div>' +
          '</div>' +
          '<div class="sc-card sc-context">' +
            '<div class="sc-q-id">Context</div>' +
            '<h2 class="sc-q-text">' + escapeHtml(CONTEXT_PROMPT) + '</h2>' +
            '<label class="sr-only" for="sc-context-input">Context response</label>' +
            '<textarea id="sc-context-input" maxlength="2000" placeholder="Optional, but useful.">' + escapeHtml(state.context || '') + '</textarea>' +
            '<p class="hint">' + escapeHtml(CONTEXT_HINT) + '</p>' +
            '<div class="sc-nav">' +
              '<button type="button" class="btn btn-ghost" id="sc-back">Previous</button>' +
              '<div class="btn-row">' +
                '<button type="button" class="btn btn-ghost" id="sc-restart">Start again</button>' +
                '<button type="button" class="btn btn-primary" id="sc-finish"><span>Continue</span></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    el('sc-back').addEventListener('click', function () {
      setState({ step: 'questions', questionIndex: QUESTIONS.length - 1, context: el('sc-context-input').value });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el('sc-finish').addEventListener('click', function () {
      setState({ step: 'details', context: el('sc-context-input').value, submitError: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    bindRestart('sc-restart');
  }

  function renderDetails(root, state) {
    var c = state.contact || {};
    var prog = progressMeta(state);
    var err = state.submitError ? '<p class="form-error" role="alert">' + escapeHtml(state.submitError) + '</p>' : '';
    var submitting = !!state.submitting;

    root.innerHTML =
      '<section class="section no-border" style="padding-top:48px;">' +
        '<div class="wrap sc-shell">' +
          '<div class="sc-progress-wrap">' +
            '<div class="sc-progress-meta">' +
              '<span>Step ' + prog.current + ' of ' + prog.total + '</span>' +
              '<span>Your details</span>' +
            '</div>' +
            '<div class="sc-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="Assessment progress">' +
              '<div class="sc-progress-fill" style="width:100%;"></div>' +
            '</div>' +
          '</div>' +
          '<div class="sc-card">' +
            '<p class="eyebrow">Before your snapshot</p>' +
            '<h2 class="sc-q-text" style="max-width:22ch;">Your details</h2>' +
            '<p>These details are used to provide your System Check result and to enable appropriate follow-up regarding your enquiry. Please see our <a href="/privacy/" style="color:var(--sand); text-decoration:underline;">Privacy Notice</a>.</p>' +
            '<p class="small">Do not submit medical information, health information, or identifying employee performance information.</p>' +
            err +
            '<form id="sc-lead-form" class="lead-form" novalidate>' +
              '<div class="form-grid">' +
                field('first_name', 'First name', c.first_name, true) +
                field('last_name', 'Last name', c.last_name, true) +
                field('work_email', 'Work email', c.work_email, true, 'email') +
                field('organisation', 'Organisation', c.organisation, true) +
                field('role', 'Role', c.role || '', false) +
                sectorField(c.sector || '') +
              '</div>' +
              '<label class="check-row">' +
                '<input type="checkbox" id="marketing_consent" name="marketing_consent"' + (c.marketing_consent ? ' checked' : '') + (submitting ? ' disabled' : '') + '>' +
                '<span>Send me occasional NORDR insights. <em>(Optional)</em></span>' +
              '</label>' +
              '<div class="hp-field" aria-hidden="true">' +
                '<label for="company_website">Company website</label>' +
                '<input type="text" id="company_website" name="company_website" tabindex="-1" autocomplete="off">' +
              '</div>' +
              '<div class="sc-nav" style="margin-top:28px;">' +
                '<button type="button" class="btn btn-ghost" id="sc-back"' + (submitting ? ' disabled' : '') + '>Previous</button>' +
                '<div class="btn-row">' +
                  '<button type="button" class="btn btn-ghost" id="sc-restart"' + (submitting ? ' disabled' : '') + '>Start again</button>' +
                  '<button type="submit" class="btn btn-primary" id="sc-submit"' + (submitting ? ' disabled' : '') + '><span>' + (submitting ? 'Submitting…' : 'View System Snapshot') + '</span></button>' +
                '</div>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</section>';

    if (!submitting) {
      el('sc-back').addEventListener('click', function () {
        setState({
          step: 'context',
          contact: readContactFromForm(),
          submitError: null
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      el('sc-lead-form').addEventListener('submit', function (e) {
        e.preventDefault();
        submitAssessment();
      });

      bindRestart('sc-restart');
    }
  }

  function field(name, label, value, required, type) {
    return '<div class="form-field">' +
      '<label for="' + name + '">' + escapeHtml(label) + (required ? ' <span class="req">*</span>' : '') + '</label>' +
      '<input type="' + (type || 'text') + '" id="' + name + '" name="' + name + '" value="' + escapeAttr(value || '') + '"' +
        (required ? ' required' : '') + ' maxlength="160" autocomplete="on">' +
    '</div>';
  }

  function sectorField(value) {
    return '<div class="form-field">' +
      '<label for="sector">Sector <span class="req">*</span></label>' +
      '<select id="sector" name="sector" required>' +
        '<option value="">Select sector</option>' +
        SECTORS.map(function (s) {
          return '<option value="' + escapeAttr(s) + '"' + (value === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
        }).join('') +
      '</select>' +
    '</div>';
  }

  function readContactFromForm() {
    return {
      first_name: (el('first_name') && el('first_name').value) || '',
      last_name: (el('last_name') && el('last_name').value) || '',
      work_email: (el('work_email') && el('work_email').value) || '',
      organisation: (el('organisation') && el('organisation').value) || '',
      role: (el('role') && el('role').value) || '',
      sector: (el('sector') && el('sector').value) || '',
      marketing_consent: !!(el('marketing_consent') && el('marketing_consent').checked)
    };
  }

  function clientValidateContact(contact) {
    if (!contact.first_name.trim()) return 'Please enter your first name.';
    if (!contact.last_name.trim()) return 'Please enter your last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.work_email.trim())) return 'Please enter a valid work email.';
    if (!contact.organisation.trim()) return 'Please enter your organisation.';
    if (!contact.sector.trim()) return 'Please select a sector.';
    return null;
  }

  function submitAssessment() {
    var state = loadState();
    var contact = readContactFromForm();
    var honeypot = el('company_website') ? el('company_website').value : '';

    var localError = clientValidateContact(contact);
    if (localError) {
      setState({ contact: contact, submitError: localError, step: 'details' });
      return;
    }

    var submitBtn = el('sc-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Submitting…</span>';
    }

    // Persist contact and show submitting UI without clearing answers
    var next = Object.assign(loadState(), {
      contact: contact,
      submitError: null,
      submitting: true,
      step: 'details'
    });
    saveState(next);
    render();

    fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: state.answers,
        context: state.context || '',
        contact: contact,
        company_website: honeypot
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        return { status: res.status, data: data };
      }).catch(function () {
        return { status: res.status, data: { ok: false, error: 'Unexpected response.' } };
      });
    }).then(function (result) {
      if (!result.data || !result.data.ok || !result.data.snapshot) {
        var msg = (result.data && result.data.error) ||
          "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again.";
        setState({
          step: 'submit-error',
          contact: contact,
          submitError: msg,
          submitting: false,
          submitted: false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setState({
        step: 'results',
        contact: contact,
        snapshot: result.data.snapshot,
        submissionId: result.data.submissionId || null,
        submitted: true,
        submitError: null,
        submitting: false
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function () {
      setState({
        step: 'submit-error',
        contact: contact,
        submitError: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again.",
        submitting: false,
        submitted: false
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function renderSubmitError(root, state) {
    root.innerHTML =
      '<section class="section no-border" style="padding-top:72px;">' +
        '<div class="wrap sc-shell">' +
          '<div class="sc-card">' +
            '<p class="eyebrow">Submission</p>' +
            '<h2 class="sc-q-text" style="max-width:24ch;">Unable to record just now</h2>' +
            '<p role="alert">' + escapeHtml(state.submitError || "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again.") + '</p>' +
            '<div class="btn-row" style="margin-top:28px;">' +
              '<button type="button" class="btn btn-primary" id="sc-retry"><span>Try again</span></button>' +
              '<button type="button" class="btn btn-ghost" id="sc-restart">Start again</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    el('sc-retry').addEventListener('click', function () {
      setState({ step: 'details', submitError: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    bindRestart('sc-restart');
  }

  function renderResults(root, state) {
    var snap = state.snapshot;
    if (!snap || !state.submitted) {
      setState({ step: 'details', submitError: null });
      return;
    }

    var dimsHtml = DIMENSIONS.map(function (id) {
      var d = snap.dimensions[id];
      var interpretation = d.interpretation || STATUS_COPY[d.status] || '';
      return '<article class="result-dim">' +
        '<h3>' + escapeHtml(d.label) + '</h3>' +
        '<div class="result-status">' + escapeHtml(d.status) + '</div>' +
        '<p>' + escapeHtml(interpretation) + '</p>' +
        '<p class="result-confidence">Confidence: ' + escapeHtml(d.confidence) + '</p>' +
      '</article>';
    }).join('');

    var clarityHtml = (snap.clarity && snap.clarity.length)
      ? '<ul>' + snap.clarity.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
      : '<p>No areas currently appear relatively clear based on the responses provided.</p>';

    var exploreHtml = (snap.explore && snap.explore.length)
      ? '<ul>' + snap.explore.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
      : '<p>Responses did not highlight an immediate area requiring further exploration.</p>';

    var questionsHtml = '<ol class="priority-list">' +
      (snap.priorities || []).map(function (p) { return '<li>' + escapeHtml(p.question) + '</li>'; }).join('') +
      '</ol>';

    var contextBlock = snap.context && String(snap.context).trim()
      ? '<div class="insight-block"><h3>Your context note</h3><p>' + escapeHtml(String(snap.context).trim()) + '</p></div>'
      : '';

    var suggestBits = [];
    if (snap.patternsDetected) {
      suggestBits.push('Detected relationship patterns point toward questions about how parts of the system connect, rather than isolated capability gaps.');
    }
    if (snap.explore && snap.explore.length) {
      suggestBits.push('Lower-visibility areas may benefit from more structured enquiry before deciding what to change.');
    }
    if (!suggestBits.length) {
      suggestBits.push('Responses suggest a relatively coherent picture across the dimensions reviewed. Further investigation can still help test assumptions and strengthen evidence.');
    }

    root.innerHTML =
      '<section class="section no-border" style="padding-top:56px;" id="snapshot">' +
        '<div class="wrap" style="max-width:960px;">' +
          '<div class="print-only print-header"><strong>NORDR Performance</strong><div class="small">Human Performance System Snapshot</div></div>' +
          '<p class="eyebrow">Results</p>' +
          '<h1 style="font-size:clamp(30px,4.8vw,48px);">Your NORDR System Snapshot</h1>' +
          '<hr class="rule">' +
          '<p class="lede">A cautious reading of where the current picture appears relatively clear, and where further understanding may help.</p>' +
          '<div class="results-grid">' + dimsHtml + '</div>' +
          '<div class="insight-block">' +
            '<h3>What your responses suggest</h3>' +
            suggestBits.map(function (t) { return '<p>' + escapeHtml(t) + '</p>'; }).join('') +
          '</div>' +
          '<div class="insight-block">' +
            '<h3>Areas of relative clarity</h3>' + clarityHtml +
          '</div>' +
          '<div class="insight-block">' +
            '<h3>Where further exploration may be useful</h3>' + exploreHtml +
          '</div>' +
          '<div class="insight-block">' +
            '<h3>Three questions worth investigating</h3>' + questionsHtml +
          '</div>' +
          contextBlock +
          '<div class="context-note">' +
            '<h3 style="margin-bottom:12px;">Important context</h3>' +
            '<p>The System Check does not establish that any area, service or process is ineffective. It identifies areas where additional evidence or system understanding may help inform further investigation.</p>' +
          '</div>' +
          '<div class="sc-panel" style="margin-top:48px;">' +
            '<h2 style="font-size:clamp(22px,3.2vw,30px);">A System Check identifies questions.<br>An audit investigates them.</h2>' +
            '<div class="btn-row no-print" style="margin-top:28px;">' +
              '<a class="btn btn-primary" href="/contact/"><span>Contact NORDR</span></a>' +
              '<button type="button" class="btn btn-outline" id="sc-print"><span>Print / Save Snapshot</span></button>' +
              '<button type="button" class="btn btn-ghost" id="sc-restart">Start again</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    el('sc-print').addEventListener('click', function () { window.print(); });
    bindRestart('sc-restart');
  }

  function bindRestart(id) {
    var btn = el(id);
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.confirm('Start again and clear your System Check progress?')) {
        clearState();
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  window.NORDRSystemCheck = {
    QUESTIONS: QUESTIONS,
    SCORE_MAP: SCORE_MAP,
    SECTORS: SECTORS
  };

  document.addEventListener('DOMContentLoaded', render);
})();
