'use strict';

const assert = require('assert');
const engine = require('../lib/system-check-engine');

function fill(code) {
  const answers = {};
  engine.QUESTION_IDS.forEach((id) => { answers[id] = code; });
  return answers;
}

function set(base, patch) {
  return Object.assign({}, base, patch);
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test('All A → Established / High', () => {
  const dims = engine.computeDimensions(fill('A'));
  engine.DIMENSIONS.forEach((d) => {
    assert.strictEqual(dims[d].status, 'Established');
    assert.strictEqual(dims[d].confidence, 'High');
    assert.strictEqual(dims[d].index, 4);
  });
  const view = engine.participantView(engine.buildSnapshot(fill('A'), ''));
  assert.strictEqual(view.dimensions.objective.index, undefined);
});

test('All D → Limited Visibility / High', () => {
  const dims = engine.computeDimensions(fill('D'));
  engine.DIMENSIONS.forEach((d) => {
    assert.strictEqual(dims[d].status, 'Limited Visibility');
    assert.strictEqual(dims[d].confidence, 'High');
    assert.strictEqual(dims[d].index, 1);
  });
});

test('All Unsure → Not Established / Limited / null index', () => {
  const dims = engine.computeDimensions(fill('E'));
  engine.DIMENSIONS.forEach((d) => {
    assert.strictEqual(dims[d].status, 'Not Established');
    assert.strictEqual(dims[d].confidence, 'Limited');
    assert.strictEqual(dims[d].index, null);
  });
});

test('One answered + one Unsure → Limited confidence from answered only', () => {
  const answers = fill('E');
  answers['OBJ-01'] = 'A';
  answers['OBJ-02'] = 'E';
  const dims = engine.computeDimensions(answers);
  assert.strictEqual(dims.objective.index, 4);
  assert.strictEqual(dims.objective.status, 'Established');
  assert.strictEqual(dims.objective.confidence, 'Limited');
  assert.notStrictEqual(dims.objective.index, 0);
});

test('Unsure never equals zero in scoring map', () => {
  assert.strictEqual(engine.SCORE_MAP.E, null);
  assert.strictEqual(engine.scoreOf({ 'OBJ-01': 'E' }, 'OBJ-01'), null);
});

test('PAT-01 Objective / Activity Disconnect', () => {
  const answers = fill('C');
  answers['OBJ-01'] = 'A'; // 4
  answers['OBJ-02'] = 'D'; // 1
  const snap = engine.buildSnapshot(answers, '');
  assert.ok(snap.patterns.some((p) => p.id === 'PAT-01'));
});

test('PAT-04 Evidence / Decision Disconnect', () => {
  const answers = fill('C');
  answers['EVD-01'] = 'A';
  answers['DEC-01'] = 'D';
  const snap = engine.buildSnapshot(answers, '');
  assert.ok(snap.patterns.some((p) => p.id === 'PAT-04'));
});

test('PAT-05 Activity / Outcome Disconnect', () => {
  const answers = fill('C');
  answers['EVD-01'] = 'D';
  answers['OUT-01'] = 'D';
  const snap = engine.buildSnapshot(answers, '');
  assert.ok(snap.patterns.some((p) => p.id === 'PAT-05'));
});

test('PAT-06 Evaluation / Learning Disconnect', () => {
  const answers = fill('C');
  answers['OUT-01'] = 'A';
  answers['OUT-02'] = 'D';
  const snap = engine.buildSnapshot(answers, '');
  assert.ok(snap.patterns.some((p) => p.id === 'PAT-06'));
});

test('Exactly three non-duplicative priority questions', () => {
  const snap = engine.buildSnapshot(fill('D'), 'context note');
  assert.strictEqual(snap.priorities.length, 3);
  const keys = snap.priorities.map((p) => p.question.toLowerCase());
  assert.strictEqual(new Set(keys).size, 3);
});

test('Valid payload accepted', () => {
  const result = engine.validatePayload({
    answers: fill('B'),
    context: 'Hello',
    contact: {
      first_name: 'Alex',
      last_name: 'Example',
      work_email: 'Alex.Example@Org.COM',
      organisation: 'Example Org',
      role: 'Lead',
      sector: 'Defence',
      marketing_consent: false
    }
  });
  assert.ok(result.ok);
  assert.strictEqual(result.value.contact.work_email, 'alex.example@org.com');
});

test('Missing required field rejected', () => {
  const result = engine.validatePayload({
    answers: fill('B'),
    contact: {
      first_name: '',
      last_name: 'Example',
      work_email: 'a@b.com',
      organisation: 'Org'
    }
  });
  assert.ok(!result.ok);
});

test('Invalid email rejected', () => {
  const result = engine.validateContact({
    first_name: 'A',
    last_name: 'B',
    work_email: 'not-an-email',
    organisation: 'Org'
  });
  assert.ok(!result.ok);
});

test('Malformed question ID rejected', () => {
  const answers = fill('A');
  answers['FAKE-01'] = 'A';
  const result = engine.validateAnswers(answers);
  assert.ok(!result.ok);
});

test('Invalid answer code rejected', () => {
  const answers = fill('A');
  answers['OBJ-01'] = 'Z';
  const result = engine.validateAnswers(answers);
  assert.ok(!result.ok);
});

test('Honeypot rejected', () => {
  const result = engine.validatePayload({
    answers: fill('A'),
    contact: {
      first_name: 'A',
      last_name: 'B',
      work_email: 'a@b.com',
      organisation: 'Org'
    },
    company_website: 'http://spam.test'
  });
  assert.ok(!result.ok);
});

test('Storage payload preserves raw responses and context', () => {
  const answers = fill('B');
  answers['OBJ-01'] = 'A';
  const contact = {
    first_name: 'Alex',
    last_name: 'Example',
    work_email: 'alex@example.com',
    organisation: 'Org',
    role: null,
    sector: 'Motorsport',
    marketing_consent: true
  };
  const snap = engine.buildSnapshot(answers, 'Exact context wording');
  const storage = engine.buildStoragePayload(contact, answers, 'Exact context wording', snap);
  assert.strictEqual(storage.responses.length, 13);
  const ctx = storage.responses.find((r) => r.question_id === 'CTX-01');
  assert.strictEqual(ctx.raw_text, 'Exact context wording');
  assert.strictEqual(storage.priority_questions.length, 3);
  assert.strictEqual(storage.contact.privacy_notice_version, engine.PRIVACY_NOTICE_VERSION);
});

test('Discovery brief contains DO NOT ASSUME', () => {
  const answers = fill('C');
  const snap = engine.buildSnapshot(answers, '');
  const brief = engine.buildDiscoveryBrief({
    first_name: 'A',
    last_name: 'B',
    work_email: 'a@b.com',
    organisation: 'Org',
    role: 'R',
    sector: 'Defence'
  }, snap, { answers, created_at: snap.createdAt });
  assert.ok(Array.isArray(brief.DO_NOT_ASSUME));
  assert.ok(brief.DO_NOT_ASSUME.length >= 6);
  assert.strictEqual(brief.THREE_PRIORITY_QUESTIONS.length, 3);
});

test('Duplicate contact emails normalise identically', () => {
  assert.strictEqual(engine.normaliseEmail('  Person@ORG.com '), 'person@org.com');
});

test('PAT-01 does not fire when second response is Unsure', () => {
  const answers = fill('C');
  answers['OBJ-01'] = 'A';
  answers['OBJ-02'] = 'E';
  const snap = engine.buildSnapshot(answers, '');
  assert.ok(!snap.patterns.some((p) => p.id === 'PAT-01'));
});

console.log('\n' + passed + ' tests completed');
