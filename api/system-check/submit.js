'use strict';

const https = require('https');
const engine = require('../../lib/system-check-engine');

const MAX_BODY_BYTES = 48 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 12;

/** @type {Map<string, number[]>} */
const rateBuckets = new Map();

function postJson(urlString, headers, objectBody) {
  const body = JSON.stringify(objectBody);
  const u = new URL(urlString);
  const opts = {
    hostname: u.hostname,
    path: u.pathname + (u.search || ''),
    method: 'POST',
    headers: Object.assign({}, headers, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    })
  };

  return new Promise(function (resolve, reject) {
    const req = https.request(opts, function (res) {
      const chunks = [];
      res.on('data', function (chunk) { chunks.push(chunk); });
      res.on('end', function () {
        resolve({
          status: res.statusCode || 0,
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          text: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(ip, arr);
  return false;
}

function allowedOrigin(origin) {
  const defaults = [
    'https://nordrperformance.com',
    'https://www.nordrperformance.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173'
  ];
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list = defaults.concat(extra);
  if (!origin) return true;
  return list.includes(origin);
}

function setCors(res, origin) {
  if (origin && allowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(req) {
  // Vercel may already parse JSON into req.body
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string' && req.body.length) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.reject(Object.assign(new Error('Malformed JSON'), { statusCode: 400 }));
    }
  }

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(Object.assign(new Error('Malformed JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  if (origin && !allowedOrigin(origin)) {
    json(res, 403, { ok: false, error: 'Forbidden.' });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    json(res, 429, { ok: false, error: 'Too many requests. Please try again shortly.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    json(res, 503, {
      ok: false,
      error: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again."
    });
    return;
  }

  let supabaseBase;
  try {
    const cleanedUrl = String(supabaseUrl).trim().replace(/^["']+|["']+$/g, '');
    supabaseBase = new URL(cleanedUrl).origin;
  } catch (e) {
    console.error('Invalid SUPABASE_URL format');
    json(res, 503, {
      ok: false,
      error: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again."
    });
    return;
  }

  const trimmedKey = String(serviceKey).trim().replace(/^["']+|["']+$/g, '');
  if (!trimmedKey) {
    console.error('Empty SUPABASE_SERVICE_ROLE_KEY');
    json(res, 503, {
      ok: false,
      error: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again."
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const code = err.statusCode || 400;
    json(res, code, {
      ok: false,
      error: code === 413 ? 'Payload too large.' : 'Malformed payload.'
    });
    return;
  }

  const validated = engine.validatePayload(body);
  if (!validated.ok) {
    json(res, 400, { ok: false, error: validated.error });
    return;
  }

  const { answers, context, contact } = validated.value;

  // Server-side deterministic interpretation — do not trust browser scores
  const snapshot = engine.buildSnapshot(answers, context);
  const storage = engine.buildStoragePayload(contact, answers, context, snapshot);

  try {
    const headers = {
      apikey: trimmedKey,
      Authorization: 'Bearer ' + trimmedKey
    };

    async function callRpc(fnName) {
      return postJson(supabaseBase + '/rest/v1/rpc/' + fnName, headers, { payload: storage });
    }

    let result = await callRpc('create_system_check_submission');
    if (!result.ok && /Could not find the function|PGRST202|does not exist/i.test(result.text || '')) {
      result = await callRpc('submit_system_check');
    }

    let data = null;
    try {
      data = result.text ? JSON.parse(result.text) : null;
    } catch (e) {
      data = null;
    }

    if (!result.ok) {
      console.error('system_check_submission rpc failed', {
        status: result.status,
        body: typeof result.text === 'string' ? result.text.slice(0, 400) : 'none'
      });
      json(res, 502, {
        ok: false,
        error: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again."
      });
      return;
    }

    const participant = engine.participantView(snapshot);
    const submissionId = data && data.submission_id ? data.submission_id : null;

    json(res, 200, {
      ok: true,
      submissionId: submissionId,
      snapshot: participant
    });
  } catch (err) {
    console.error('Unexpected submission error', err && err.message ? err.message : 'unknown');
    json(res, 500, {
      ok: false,
      error: "We couldn't securely record your System Check just now. Your responses remain saved in this browser. Please try again."
    });
  }
};
