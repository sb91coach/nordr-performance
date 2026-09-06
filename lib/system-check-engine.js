'use strict';

const SUBMISSION_VERSION = 'system-check-v1';
const PRIVACY_NOTICE_VERSION = '2026-09-v1';
const HEADLINE_QUESTION = 'How clearly can you connect your Human Performance activity to the outcomes that matter?';
const CONTEXT_QUESTION_ID = 'CTX-01';
const CONTEXT_PROMPT = 'If you could understand one thing about your current Human Performance system that you cannot confidently answer today, what would it be?';

const DIMENSIONS = ['objective', 'system', 'human', 'evidence', 'decision', 'outcome'];

const DIM_LABELS = {
  objective: 'Objective',
  system: 'System',
  human: 'Human',
  evidence: 'Evidence',
  decision: 'Decision',
  outcome: 'Outcome'
};

const SCORE_MAP = { A: 4, B: 3, C: 2, D: 1, E: null };
const VALID_CODES = new Set(['A', 'B', 'C', 'D', 'E']);

const SECTORS = [
  'Emergency Services',
  'Defence',
  'Aviation/Aerospace',
  'Motorsport',
  'High Performance Sport',
  'Corporate/Executive',
  'Industrial/High Risk',
  'Other'
];

const STATUS_COPY = {
  Established: 'Responses suggest a relatively clear picture in this area.',
  Developing: 'Responses suggest a developing picture, with room to strengthen shared understanding.',
  'Requires Exploration': 'Responses suggest this area may benefit from further exploration.',
  'Limited Visibility': 'Responses suggest limited current visibility in this area.',
  'Not Established': 'Insufficient responses were available to form a clear picture in this area.'
};

const DO_NOT_ASSUME = [
  'existing provision is ineffective',
  'services are disconnected',
  'additional services are required',
  'lack of respondent visibility means a process does not exist',
  'association equals causation',
  'one respondent represents the entire organisation'
];

const QUESTIONS = [
  {
    id: 'OBJ-01',
    dimension: 'objective',
    text: 'How clearly is the primary outcome your Human Performance provision exists to support defined?'
  },
  {
    id: 'OBJ-02',
    dimension: 'objective',
    text: 'How clearly can existing Human Performance activity be connected to that objective?'
  },
  {
    id: 'SYS-01',
    dimension: 'system',
    text: 'Could you currently map how the people, services and processes supporting Human Performance interact?'
  },
  {
    id: 'SYS-02',
    dimension: 'system',
    text: 'How clear are responsibilities, handovers and decision points across that system?'
  },
  {
    id: 'HUM-01',
    dimension: 'human',
    text: 'How well does the organisation understand the factors enabling or constraining people from performing when required?'
  },
  {
    id: 'HUM-02',
    dimension: 'human',
    text: 'How effectively can the experiences and perspectives of people operating within the system inform Human Performance decisions?'
  },
  {
    id: 'EVD-01',
    dimension: 'evidence',
    text: 'What does current Human Performance information primarily tell you?'
  },
  {
    id: 'EVD-02',
    dimension: 'evidence',
    text: 'When different sources provide different pictures, how effectively can the organisation investigate why?'
  },
  {
    id: 'DEC-01',
    dimension: 'decision',
    text: 'How effectively does relevant Human Performance information reach the people who need it to make decisions?'
  },
  {
    id: 'DEC-02',
    dimension: 'decision',
    text: 'When a Human Performance issue is identified, how clear is the route from insight to action?'
  },
  {
    id: 'OUT-01',
    dimension: 'outcome',
    text: 'When a change or intervention is implemented, how confidently can you determine whether it produced the intended outcome?'
  },
  {
    id: 'OUT-02',
    dimension: 'outcome',
    text: 'How effectively does learning from previous outcomes influence future Human Performance decisions?'
  }
];

const QUESTION_IDS = QUESTIONS.map((q) => q.id);

const FALLBACK_QUESTIONS = [
  'How clearly does the organisation define the outcome Human Performance activity is intended to support?',
  'Where does the current Human Performance system become difficult to see or describe?',
  'What would need to be true for evidence to inform decisions more consistently?',
  'How does learning from previous outcomes currently influence what happens next?'
];

function gte(v, n) { return v != null && v >= n; }
function lte(v, n) { return v != null && v <= n; }
function lt(v, n) { return v != null && v < n; }

function scoreOf(answers, id) {
  const key = answers[id];
  if (!key) return null;
  if (!Object.prototype.hasOwnProperty.call(SCORE_MAP, key)) return null;
  return SCORE_MAP[key];
}

function statusFromIndex(index) {
  if (index == null) return 'Not Established';
  if (index >= 3.5) return 'Established';
  if (index >= 2.75) return 'Developing';
  if (index >= 2.0) return 'Requires Exploration';
  return 'Limited Visibility';
}

function computeDimensions(answers) {
  const dims = {};
  DIMENSIONS.forEach((dim) => {
    const qs = QUESTIONS.filter((q) => q.dimension === dim);
    const values = [];
    let unsureCount = 0;
    qs.forEach((q) => {
      const v = scoreOf(answers, q.id);
      if (v == null) unsureCount += 1;
      else values.push(v);
    });

    let index = null;
    let status = 'Not Established';
    let confidence = 'Limited';

    if (values.length === 0) {
      status = 'Not Established';
      confidence = 'Limited';
    } else {
      index = values.reduce((a, b) => a + b, 0) / values.length;
      status = statusFromIndex(index);
      confidence = values.length === 2 ? 'High' : 'Limited';
    }

    dims[dim] = {
      id: dim,
      label: DIM_LABELS[dim],
      index,
      status,
      confidence,
      answered: values.length,
      unsure: unsureCount,
      interpretation: STATUS_COPY[status]
    };
  });
  return dims;
}

const PATTERN_DEFS = [
  {
    id: 'PAT-01',
    name: 'Objective / Activity Disconnect',
    priority: 50,
    question: 'How clearly can existing Human Performance activity demonstrate contribution to the organisational objective?',
    test: (s) => gte(scoreOf(s, 'OBJ-01'), 3) && lte(scoreOf(s, 'OBJ-02'), 2)
  },
  {
    id: 'PAT-02',
    name: 'System Visibility / Ownership Disconnect',
    priority: 48,
    question: 'Where do responsibilities, handovers or decision points become less clear?',
    test: (s) => gte(scoreOf(s, 'SYS-01'), 3) && lte(scoreOf(s, 'SYS-02'), 2)
  },
  {
    id: 'PAT-03',
    name: 'Human Understanding / Human Voice Disconnect',
    priority: 46,
    question: 'How consistently can the experience of people operating in the system influence Human Performance decisions?',
    test: (s) => gte(scoreOf(s, 'HUM-01'), 3) && lte(scoreOf(s, 'HUM-02'), 2)
  },
  {
    id: 'PAT-04',
    name: 'Evidence / Decision Disconnect',
    priority: 50,
    question: 'Does useful Human Performance information consistently reach the people who need it at the point of decision?',
    test: (s) => gte(scoreOf(s, 'EVD-01'), 3) && lte(scoreOf(s, 'DEC-01'), 2)
  },
  {
    id: 'PAT-05',
    name: 'Activity / Outcome Disconnect',
    priority: 55,
    question: 'What evidence would be required to move from understanding what Human Performance activity occurs to understanding what it achieves?',
    test: (s) => lte(scoreOf(s, 'EVD-01'), 2) && lte(scoreOf(s, 'OUT-01'), 2)
  },
  {
    id: 'PAT-06',
    name: 'Evaluation / Learning Disconnect',
    priority: 45,
    question: 'How consistently does learning from previous Human Performance outcomes influence what happens next?',
    test: (s) => gte(scoreOf(s, 'OUT-01'), 3) && lte(scoreOf(s, 'OUT-02'), 2)
  },
  {
    id: 'PAT-07',
    name: 'Clear Objective / Unclear System',
    priority: 55,
    question: 'Is the organisation clearer about what it wants to achieve than how the Human Performance system collectively supports that objective?',
    test: (s, d) => gte(d.objective.index, 3.5) && lt(d.system.index, 2.75)
  },
  {
    id: 'PAT-08',
    name: 'Evidence Without Translation',
    priority: 52,
    question: 'Where does useful Human Performance information stop translating into action or decision?',
    test: (s, d) => gte(d.evidence.index, 3.0) && lt(d.decision.index, 2.75)
  },
  {
    id: 'PAT-09',
    name: 'Defined System / Limited Human Visibility',
    priority: 47,
    question: 'How well does the current Human Performance system reflect the experience of the people expected to use or operate within it?',
    test: (s, d) => gte(d.system.index, 3.0) && lt(d.human.index, 2.75)
  },
  {
    id: 'PAT-10',
    name: 'Incomplete Feedback Loop',
    priority: 40,
    question: 'How does the organisation determine whether a Human Performance decision produced the intended effect, and how does that learning influence what happens next?',
    test: (s, d) => lt(d.outcome.index, 2.75)
  }
];

function detectPatterns(answers, dims) {
  return PATTERN_DEFS.filter((p) => {
    try { return !!p.test(answers, dims); } catch (e) { return false; }
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

function lowerVisibilityDims(dims) {
  return DIMENSIONS
    .map((id) => dims[id])
    .filter((d) => d.status === 'Limited Visibility' || d.status === 'Requires Exploration' || d.status === 'Not Established')
    .sort((a, b) => {
      const av = a.index == null ? -1 : a.index;
      const bv = b.index == null ? -1 : b.index;
      return av - bv;
    });
}

function limitedConfidenceDims(dims) {
  return DIMENSIONS.map((id) => dims[id]).filter((d) => d.confidence === 'Limited');
}

function generatePriorityQuestions(answers, dims, patterns) {
  const selected = [];
  const seen = {};

  function add(question, sourceType, sourceId) {
    if (!question) return;
    const key = question.trim().toLowerCase();
    if (seen[key] || selected.length >= 3) return;
    seen[key] = true;
    selected.push({
      question,
      source: sourceId || sourceType,
      source_type: sourceType,
      source_id: sourceId || null
    });
  }

  patterns.forEach((p) => add(p.question, 'pattern', p.id));
  lowerVisibilityDims(dims).forEach((d) => {
    add(
      'Where would greater clarity in ' + d.label.toLowerCase() + ' most improve confidence in Human Performance decisions?',
      'lower_visibility',
      d.id
    );
  });
  limitedConfidenceDims(dims).forEach((d) => {
    add(
      'What additional evidence would strengthen understanding of the ' + d.label.toLowerCase() + ' dimension?',
      'limited_confidence',
      d.id
    );
  });
  add(HEADLINE_QUESTION, 'headline', 'headline');
  FALLBACK_QUESTIONS.forEach((q, i) => add(q, 'fallback', 'fallback-' + i));

  return selected.slice(0, 3);
}

function clarityBuckets(dims) {
  const clarity = [];
  const explore = [];
  DIMENSIONS.forEach((id) => {
    const d = dims[id];
    if (d.status === 'Established' || d.status === 'Developing') clarity.push(d);
    else explore.push(d);
  });
  return { clarity, explore };
}

function buildSnapshot(answers, context) {
  const dims = computeDimensions(answers);
  const patterns = detectPatterns(answers, dims);
  const priorities = generatePriorityQuestions(answers, dims, patterns);
  const buckets = clarityBuckets(dims);
  return {
    version: SUBMISSION_VERSION,
    headlineQuestion: HEADLINE_QUESTION,
    createdAt: new Date().toISOString(),
    dimensions: dims,
    patterns: patterns.map((p) => ({
      id: p.id,
      name: p.name,
      question: p.question,
      priority: p.priority
    })),
    priorities,
    clarity: buckets.clarity.map((d) => d.label),
    explore: buckets.explore.map((d) => d.label),
    context: context || ''
  };
}

function participantView(snapshot) {
  const dimensions = {};
  DIMENSIONS.forEach((id) => {
    const d = snapshot.dimensions[id];
    dimensions[id] = {
      label: d.label,
      status: d.status,
      confidence: d.confidence,
      interpretation: d.interpretation || STATUS_COPY[d.status]
    };
  });
  return {
    version: snapshot.version,
    headlineQuestion: snapshot.headlineQuestion,
    dimensions,
    clarity: snapshot.clarity,
    explore: snapshot.explore,
    priorities: snapshot.priorities.map((p) => ({ question: p.question })),
    patternsDetected: snapshot.patterns.length > 0,
    context: snapshot.context || ''
  };
}

function buildDiscoveryBrief(contact, snapshot, submissionMeta) {
  const answers = (submissionMeta && submissionMeta.answers) || {};
  const responses = QUESTIONS.map((q) => ({
    question_id: q.id,
    dimension: q.dimension,
    question_text: q.text,
    response_code: answers[q.id] || null,
    response_value: scoreOf(answers, q.id)
  }));

  return {
    CONTACT: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      work_email: contact.work_email,
      role: contact.role || null
    },
    ORGANISATION: contact.organisation,
    ROLE: contact.role || null,
    SECTOR: contact.sector || null,
    COMPLETION_DATE: (submissionMeta && submissionMeta.created_at) || snapshot.createdAt,
    SYSTEM_CHECK_VERSION: SUBMISSION_VERSION,
    HEADLINE_QUESTION: HEADLINE_QUESTION,
    FULL_RESPONSES: responses.concat([{
      question_id: CONTEXT_QUESTION_ID,
      dimension: 'context',
      question_text: CONTEXT_PROMPT,
      response_code: null,
      response_value: null,
      raw_text: snapshot.context || ''
    }]),
    DIMENSION_INTERPRETATION: DIMENSIONS.map((id) => {
      const d = snapshot.dimensions[id];
      return {
        dimension: d.label,
        index: d.index,
        status: d.status,
        confidence: d.confidence,
        interpretation: d.interpretation
      };
    }),
    DETECTED_PATTERNS: snapshot.patterns,
    THREE_PRIORITY_QUESTIONS: snapshot.priorities,
    DO_NOT_ASSUME
  };
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normaliseName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Answers are required.' };
  }
  const keys = Object.keys(answers);
  for (let i = 0; i < keys.length; i += 1) {
    if (!QUESTION_IDS.includes(keys[i])) {
      return { ok: false, error: 'Unexpected question ID.' };
    }
  }
  for (let i = 0; i < QUESTION_IDS.length; i += 1) {
    const id = QUESTION_IDS[i];
    const code = answers[id];
    if (!VALID_CODES.has(code)) {
      return { ok: false, error: 'Invalid or missing response code.' };
    }
  }
  return { ok: true };
}

function validateContact(contact) {
  if (!contact || typeof contact !== 'object') {
    return { ok: false, error: 'Contact details are required.' };
  }
  const first_name = normaliseName(contact.first_name);
  const last_name = normaliseName(contact.last_name);
  const work_email = normaliseEmail(contact.work_email);
  const organisation = normaliseName(contact.organisation);
  const role = normaliseName(contact.role || '');
  const sector = normaliseName(contact.sector || '');
  const marketing_consent = contact.marketing_consent === true;

  if (!first_name || first_name.length > 80) return { ok: false, error: 'First name is required.' };
  if (!last_name || last_name.length > 80) return { ok: false, error: 'Last name is required.' };
  if (!isValidEmail(work_email)) return { ok: false, error: 'A valid work email is required.' };
  if (!organisation || organisation.length > 160) return { ok: false, error: 'Organisation is required.' };
  if (role.length > 120) return { ok: false, error: 'Role is too long.' };
  if (sector && !SECTORS.includes(sector)) return { ok: false, error: 'Invalid sector.' };

  return {
    ok: true,
    value: {
      first_name,
      last_name,
      work_email,
      organisation,
      role: role || null,
      sector: sector || null,
      marketing_consent
    }
  };
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Malformed payload.' };
  }
  if (body.website || body.company_website) {
    return { ok: false, error: 'Rejected.' };
  }
  const answersCheck = validateAnswers(body.answers);
  if (!answersCheck.ok) return answersCheck;

  const contactCheck = validateContact(body.contact);
  if (!contactCheck.ok) return contactCheck;

  const context = String(body.context == null ? '' : body.context);
  if (context.length > 2000) return { ok: false, error: 'Context response is too long.' };

  return {
    ok: true,
    value: {
      answers: body.answers,
      context,
      contact: contactCheck.value
    }
  };
}

function buildStoragePayload(contact, answers, context, snapshot) {
  const responses = QUESTIONS.map((q) => ({
    question_id: q.id,
    response_code: answers[q.id],
    response_value: scoreOf(answers, q.id),
    raw_text: null
  }));
  responses.push({
    question_id: CONTEXT_QUESTION_ID,
    response_code: null,
    response_value: null,
    raw_text: context
  });

  return {
    contact: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      work_email: contact.work_email,
      organisation: contact.organisation,
      role: contact.role,
      sector: contact.sector,
      marketing_consent: !!contact.marketing_consent,
      privacy_notice_version: PRIVACY_NOTICE_VERSION
    },
    submission: {
      submission_version: SUBMISSION_VERSION,
      headline_question: HEADLINE_QUESTION,
      objective_index: snapshot.dimensions.objective.index,
      system_index: snapshot.dimensions.system.index,
      human_index: snapshot.dimensions.human.index,
      evidence_index: snapshot.dimensions.evidence.index,
      decision_index: snapshot.dimensions.decision.index,
      outcome_index: snapshot.dimensions.outcome.index,
      objective_status: snapshot.dimensions.objective.status,
      system_status: snapshot.dimensions.system.status,
      human_status: snapshot.dimensions.human.status,
      evidence_status: snapshot.dimensions.evidence.status,
      decision_status: snapshot.dimensions.decision.status,
      outcome_status: snapshot.dimensions.outcome.status,
      objective_confidence: snapshot.dimensions.objective.confidence,
      system_confidence: snapshot.dimensions.system.confidence,
      human_confidence: snapshot.dimensions.human.confidence,
      evidence_confidence: snapshot.dimensions.evidence.confidence,
      decision_confidence: snapshot.dimensions.decision.confidence,
      outcome_confidence: snapshot.dimensions.outcome.confidence
    },
    responses,
    patterns: snapshot.patterns.map((p) => ({
      pattern_id: p.id,
      pattern_name: p.name,
      priority: p.priority,
      generated_question: p.question
    })),
    priority_questions: snapshot.priorities.map((p, i) => ({
      question_order: i + 1,
      question_text: p.question,
      source_type: p.source_type || null,
      source_id: p.source_id || p.source || null
    }))
  };
}

module.exports = {
  SUBMISSION_VERSION,
  PRIVACY_NOTICE_VERSION,
  HEADLINE_QUESTION,
  CONTEXT_QUESTION_ID,
  CONTEXT_PROMPT,
  DIMENSIONS,
  DIM_LABELS,
  SCORE_MAP,
  SECTORS,
  STATUS_COPY,
  DO_NOT_ASSUME,
  QUESTIONS,
  QUESTION_IDS,
  scoreOf,
  computeDimensions,
  detectPatterns,
  generatePriorityQuestions,
  buildSnapshot,
  participantView,
  buildDiscoveryBrief,
  validatePayload,
  validateAnswers,
  validateContact,
  buildStoragePayload,
  normaliseEmail,
  isValidEmail
};
