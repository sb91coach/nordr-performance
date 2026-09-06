'use strict';

/**
 * Public admin bootstrap config.
 * Returns only values that are safe for the browser (URL + anon key).
 * Never returns the service-role key.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
    return;
  }

  const url = String(process.env.SUPABASE_URL || '').trim().replace(/^["']+|["']+$/g, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim().replace(/^["']+|["']+$/g, '');

  if (!url || !anon) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      ok: false,
      error: 'Admin configuration is incomplete. SUPABASE_URL and SUPABASE_ANON_KEY are required.'
    }));
    return;
  }

  let origin;
  try {
    origin = new URL(url).origin;
  } catch (e) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, error: 'Admin configuration is invalid.' }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    supabaseUrl: origin,
    supabaseAnonKey: anon
  }));
};
