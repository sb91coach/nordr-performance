(function () {
  'use strict';

  var STORAGE_KEY = 'nordrSystemCheckV1';

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

  function gte(v, n) { return v != null && v >= n; }
  function lte(v, n) { return v != null && v <= n; }
  function lt(v, n) { return v != null && v < n; }

  var PATTERNS = [
    {
      id: 'PAT-01',
      name: 'Objective / Activity Disconnect',
      priority: 50,
      question: 'How clearly can existing Human Performance activity demonstrate contribution to the organisational objective?',
      test: function (s) { return gte(scoreOf(s, 'OBJ-01'), 3) && lte(scoreOf(s, 'OBJ-02'), 2); }
    },
    {
      id: 'PAT-02',
      name: 'System Visibility / Ownership Disconnect',
      priority: 48,
      question: 'Where do responsibilities, handovers or decision points become less clear?',
      test: function (s) { return gte(scoreOf(s, 'SYS-01'), 3) && lte(scoreOf(s, 'SYS-02'), 2); }
    },
    {
      id: 'PAT-03',
      name: 'Human Understanding / Human Voice Disconnect',
      priority: 46,
      question: 'How consistently can the experience of people operating in the system influence Human Performance decisions?',
      test: function (s) { return gte(scoreOf(s, 'HUM-01'), 3) && lte(scoreOf(s, 'HUM-02'), 2); }
    },
    {
      id: 'PAT-04',
      name: 'Evidence / Decision Disconnect',
      priority: 50,
      question: 'Does useful Human Performance information consistently reach the people who need it at the point of decision?',
      test: function (s) { return gte(scoreOf(s, 'EVD-01'), 3) && lte(scoreOf(s, 'DEC-01'), 2); }
    },
    {
      id: 'PAT-05',
      name: 'Activity / Outcome Disconnect',
      priority: 55,
      question: 'What evidence would be required to move from understanding what Human Performance activity occurs to understanding what it achieves?',
      test: function (s) { return lte(scoreOf(s, 'EVD-01'), 2) && lte(scoreOf(s, 'OUT-01'), 2); }
    },
    {
      id: 'PAT-06',
      name: 'Evaluation / Learning Disconnect',
      priority: 45,
      question: 'How consistently does learning from previous Human Performance outcomes influence what happens next?',
      test: function (s) { return gte(scoreOf(s, 'OUT-01'), 3) && lte(scoreOf(s, 'OUT-02'), 2); }
    },
    {
      id: 'PAT-07',
      name: 'Clear Objective / Unclear System',
      priority: 55,
      question: 'Is the organisation clearer about what it wants to achieve than how the Human Performance system collectively supports that objective?',
      test: function (s, d) {
        return gte(d.objective.index, 3.5) && lt(d.system.index, 2.75);
      }
    },
    {
      id: 'PAT-08',
      name: 'Evidence Without Translation',
      priority: 52,
      question: 'Where does useful Human Performance information stop translating into action or decision?',
      test: function (s, d) {
        return gte(d.evidence.index, 3.0) && lt(d.decision.index, 2.75);
      }
    },
    {
      id: 'PAT-09',
      name: 'Defined System / Limited Human Visibility',
      priority: 47,
      question: 'How well does the current Human Performance system reflect the experience of the people expected to use or operate within it?',
      test: function (s, d) {
        return gte(d.system.index, 3.0) && lt(d.human.index, 2.75);
      }
    },
    {
      id: 'PAT-10',
      name: 'Incomplete Feedback Loop',
      priority: 40,
      question: 'How does the organisation determine whether a Human Performance decision produced the intended effect, and how does that learning influence what happens next?',
      test: function (s, d) {
        return lt(d.outcome.index, 2.75);
      }
    }
  ];

  var FALLBACK_QUESTIONS = [
    'How clearly does the organisation define the outcome Human Performance activity is intended to support?',
    'Where does the current Human Performance system become difficult to see or describe?',
    'What would need to be true for evidence to inform decisions more consistently?',
    'How does learning from previous outcomes currently influence what happens next?'
  ];

  var HEADLINE_QUESTION = 'How clearly can you connect your Human Performance activity to the outcomes that matter?';

  function scoreOf(answers, id) {
    var key = answers[id];
    if (!key) return null;
    var v = SCORE_MAP[key];
    return v === undefined ? null : v;
  }

  function statusFromIndex(index) {
    if (index == null) return 'Not Established';
    if (index >= 3.5) return 'Established';
    if (index >= 2.75) return 'Developing';
    if (index >= 2.0) return 'Requires Exploration';
    return 'Limited Visibility';
  }

  function computeDimensions(answers) {
    var dims = {};
    DIMENSIONS.forEach(function (dim) {
      var qs = QUESTIONS.filter(function (q) { return q.dimension === dim; });
      var values = [];
      var unsureCount = 0;
      qs.forEach(function (q) {
        var v = scoreOf(answers, q.id);
        if (v == null) unsureCount += 1;
        else values.push(v);
      });

      var index = null;
      var status = 'Not Established';
      var confidence = 'Limited';

      if (values.length === 0) {
        status = 'Not Established';
        confidence = 'Limited';
      } else {
        index = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
        status = statusFromIndex(index);
        if (values.length === 2) confidence = 'High';
        else confidence = 'Limited';
      }

      dims[dim] = {
        id: dim,
        label: DIM_LABELS[dim],
        index: index,
        status: status,
        confidence: confidence,
        answered: values.length,
        unsure: unsureCount
      };
    });
    return dims;
  }

  function detectPatterns(answers, dims) {
    return PATTERNS.filter(function (p) {
      try {
        return !!p.test(answers, dims);
      } catch (e) {
        return false;
      }
    }).sort(function (a, b) {
      return b.priority - a.priority || a.id.localeCompare(b.id);
    });
  }

  function lowerVisibilityDims(dims) {
    return DIMENSIONS
      .map(function (id) { return dims[id]; })
      .filter(function (d) {
        return d.status === 'Limited Visibility' || d.status === 'Requires Exploration' || d.status === 'Not Established';
      })
      .sort(function (a, b) {
        var av = a.index == null ? -1 : a.index;
        var bv = b.index == null ? -1 : b.index;
        return av - bv;
      });
  }

  function limitedConfidenceDims(dims) {
    return DIMENSIONS
      .map(function (id) { return dims[id]; })
      .filter(function (d) { return d.confidence === 'Limited'; });
  }

  function generatePriorityQuestions(answers, dims, patterns) {
    var selected = [];
    var seen = {};

    function add(question, source) {
      if (!question) return;
      var key = question.trim().toLowerCase();
      if (seen[key] || selected.length >= 3) return;
      seen[key] = true;
      selected.push({ question: question, source: source });
    }

    patterns.forEach(function (p) {
      add(p.question, p.id);
    });

    lowerVisibilityDims(dims).forEach(function (d) {
      add('Where would greater clarity in ' + d.label.toLowerCase() + ' most improve confidence in Human Performance decisions?', 'dim-' + d.id);
    });

    limitedConfidenceDims(dims).forEach(function (d) {
      add('What additional evidence would strengthen understanding of the ' + d.label.toLowerCase() + ' dimension?', 'conf-' + d.id);
    });

    add(HEADLINE_QUESTION, 'headline');

    FALLBACK_QUESTIONS.forEach(function (q, i) {
      add(q, 'fallback-' + i);
    });

    return selected.slice(0, 3);
  }

  function clarityBuckets(dims) {
    var clarity = [];
    var explore = [];
    DIMENSIONS.forEach(function (id) {
      var d = dims[id];
      if (d.status === 'Established' || d.status === 'Developing') clarity.push(d);
      else explore.push(d);
    });
    return { clarity: clarity, explore: explore };
  }

  function buildSnapshot(answers, context) {
    var dims = computeDimensions(answers);
    var patterns = detectPatterns(answers, dims);
    var priorities = generatePriorityQuestions(answers, dims, patterns);
    var buckets = clarityBuckets(dims);
    return {
      createdAt: new Date().toISOString(),
      dimensions: dims,
      patterns: patterns.map(function (p) { return { id: p.id, name: p.name, question: p.question, priority: p.priority }; }),
      priorities: priorities,
      clarity: buckets.clarity.map(function (d) { return d.label; }),
      explore: buckets.explore.map(function (d) { return d.label; }),
      context: context || ''
    };
  }

  function defaultState() {
    return {
      step: 'intro',
      questionIndex: 0,
      answers: {},
      context: '',
      snapshot: null
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
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
        snapshot: state.snapshot
      }));
    } catch (e) { /* ignore quota */ }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function el(id) { return document.getElementById(id); }

  function render() {
    var root = el('system-check-app');
    if (!root) return;
    var state = loadState();

    if (state.step === 'intro') renderIntro(root, state);
    else if (state.step === 'questions') renderQuestion(root, state);
    else if (state.step === 'context') renderContext(root, state);
    else if (state.step === 'results') renderResults(root, state);
    else renderIntro(root, state);
  }

  function setState(patch) {
    var state = Object.assign(loadState(), patch);
    saveState(state);
    render();
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
      setState({ step: 'questions', questionIndex: 0, snapshot: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function progressMeta(state) {
    var total = QUESTIONS.length + 1;
    var current = state.step === 'context' ? QUESTIONS.length + 1 : Math.min(state.questionIndex + 1, QUESTIONS.length);
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
            '<div class="sc-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="Assessment progress">' +
              '<div class="sc-progress-fill" style="width:100%;"></div>' +
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
                '<button type="button" class="btn btn-primary" id="sc-finish"><span>View System Snapshot</span></button>' +
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
      var context = el('sc-context-input').value;
      var snapshot = buildSnapshot(loadState().answers, context);
      setState({ step: 'results', context: context, snapshot: snapshot });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    bindRestart('sc-restart', function () {
      return el('sc-context-input').value;
    });
  }

  function renderResults(root, state) {
    var snap = state.snapshot || buildSnapshot(state.answers, state.context);
    var dimsHtml = DIMENSIONS.map(function (id) {
      var d = snap.dimensions[id];
      return '<article class="result-dim">' +
        '<h3>' + escapeHtml(d.label) + '</h3>' +
        '<div class="result-status">' + escapeHtml(d.status) + '</div>' +
        '<p>' + escapeHtml(STATUS_COPY[d.status] || '') + '</p>' +
        '<p class="result-confidence">Confidence: ' + escapeHtml(d.confidence) + '</p>' +
      '</article>';
    }).join('');

    var clarityHtml = snap.clarity.length
      ? '<ul>' + snap.clarity.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
      : '<p>No areas currently appear relatively clear based on the responses provided.</p>';

    var exploreHtml = snap.explore.length
      ? '<ul>' + snap.explore.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
      : '<p>Responses did not highlight an immediate area requiring further exploration.</p>';

    var questionsHtml = '<ol class="priority-list">' +
      snap.priorities.map(function (p) { return '<li>' + escapeHtml(p.question) + '</li>'; }).join('') +
      '</ol>';

    var contextBlock = snap.context && snap.context.trim()
      ? '<div class="insight-block"><h3>Your context note</h3><p>' + escapeHtml(snap.context.trim()) + '</p></div>'
      : '';

    var suggestBits = [];
    if (snap.patterns.length) {
      suggestBits.push('Detected relationship patterns point toward questions about how parts of the system connect, rather than isolated capability gaps.');
    }
    if (snap.explore.length) {
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
              '<a class="btn btn-primary" href="/contact/"><span>Discuss your results</span></a>' +
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

  // Expose for optional debugging / future tests
  window.NORDRSystemCheck = {
    QUESTIONS: QUESTIONS,
    buildSnapshot: buildSnapshot,
    computeDimensions: computeDimensions,
    detectPatterns: detectPatterns,
    generatePriorityQuestions: generatePriorityQuestions,
    scoreOf: scoreOf,
    SCORE_MAP: SCORE_MAP
  };

  document.addEventListener('DOMContentLoaded', render);
})();
