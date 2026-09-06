/**
 * System Check question bank for admin display (wording only).
 * Internal numeric values: A=4 B=3 C=2 D=1 E=null (never display Unsure as 0).
 */

export const QUESTIONS = [
  {
    id: 'OBJ-01',
    dimension: 'objective',
    text: 'How clearly is the primary outcome your Human Performance provision exists to support defined?',
    options: {
      A: 'Clearly defined and consistently understood',
      B: 'Defined, but interpreted differently across the organisation',
      C: 'Broadly understood but not formally defined',
      D: 'Currently unclear',
      E: 'Unsure'
    }
  },
  {
    id: 'OBJ-02',
    dimension: 'objective',
    text: 'How clearly can existing Human Performance activity be connected to that objective?',
    options: {
      A: 'A clear connection across the system',
      B: 'Clear for some activities',
      C: 'Largely assumed',
      D: 'Difficult to establish',
      E: 'Unsure'
    }
  },
  {
    id: 'SYS-01',
    dimension: 'system',
    text: 'Could you currently map how the people, services and processes supporting Human Performance interact?',
    options: {
      A: 'Yes, clearly',
      B: 'Mostly',
      C: 'Partially',
      D: 'Not currently',
      E: 'Unsure'
    }
  },
  {
    id: 'SYS-02',
    dimension: 'system',
    text: 'How clear are responsibilities, handovers and decision points across that system?',
    options: {
      A: 'Clearly established',
      B: 'Mostly established',
      C: 'Variable',
      D: 'Largely unclear',
      E: 'Unsure'
    }
  },
  {
    id: 'HUM-01',
    dimension: 'human',
    text: 'How well does the organisation understand the factors enabling or constraining people from performing when required?',
    options: {
      A: 'Strong understanding supported by evidence',
      B: 'Reasonable understanding',
      C: 'Some factors understood',
      D: 'Limited visibility',
      E: 'Unsure'
    }
  },
  {
    id: 'HUM-02',
    dimension: 'human',
    text: 'How effectively can the experiences and perspectives of people operating within the system inform Human Performance decisions?',
    options: {
      A: 'Routinely and meaningfully',
      B: 'In some areas',
      C: 'Primarily informally',
      D: 'Rarely',
      E: 'Unsure'
    }
  },
  {
    id: 'EVD-01',
    dimension: 'evidence',
    text: 'What does current Human Performance information primarily tell you?',
    options: {
      A: 'Outcomes and their relationship to activity',
      B: 'A mixture of outcomes and activity',
      C: 'Primarily activity and utilisation',
      D: 'Very limited information',
      E: 'Unsure'
    }
  },
  {
    id: 'EVD-02',
    dimension: 'evidence',
    text: 'When different sources provide different pictures, how effectively can the organisation investigate why?',
    options: {
      A: 'Systematically',
      B: 'Usually',
      C: 'Sometimes',
      D: 'Rarely',
      E: 'Unsure'
    }
  },
  {
    id: 'DEC-01',
    dimension: 'decision',
    text: 'How effectively does relevant Human Performance information reach the people who need it to make decisions?',
    options: {
      A: 'Consistently and at the right time',
      B: 'Usually',
      C: 'Variable',
      D: 'Often difficult',
      E: 'Unsure'
    }
  },
  {
    id: 'DEC-02',
    dimension: 'decision',
    text: 'When a Human Performance issue is identified, how clear is the route from insight to action?',
    options: {
      A: 'Clear and established',
      B: 'Generally clear',
      C: 'Depends on the issue',
      D: 'Often unclear',
      E: 'Unsure'
    }
  },
  {
    id: 'OUT-01',
    dimension: 'outcome',
    text: 'When a change or intervention is implemented, how confidently can you determine whether it produced the intended outcome?',
    options: {
      A: 'Consistently',
      B: 'In most cases',
      C: 'In some cases',
      D: 'Rarely',
      E: 'Unsure'
    }
  },
  {
    id: 'OUT-02',
    dimension: 'outcome',
    text: 'How effectively does learning from previous outcomes influence future Human Performance decisions?',
    options: {
      A: 'Systematically',
      B: 'Regularly',
      C: 'Occasionally',
      D: 'Rarely',
      E: 'Unsure'
    }
  }
];

export function questionById(id) {
  return QUESTIONS.find(function (q) { return q.id === id; }) || null;
}

export function responseWording(questionId, code) {
  if (code === 'E' || code == null && !questionId) return 'Unsure';
  const q = questionById(questionId);
  if (!q) return code || '—';
  if (code === 'E') return 'Unsure';
  return (q.options && q.options[code]) || code || '—';
}

export function formatInternalValue(code, value) {
  if (code === 'E' || value == null) return 'null / not scored';
  return String(value);
}
