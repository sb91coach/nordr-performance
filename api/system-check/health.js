'use strict';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
    return;
  }

  const rawUrl = process.env.SUPABASE_URL || '';
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const cleanedUrl = String(rawUrl).trim().replace(/^["']+|["']+$/g, '');
  const cleanedKey = String(rawKey).trim().replace(/^["']+|["']+$/g, '');

  let urlHost = null;
  let urlOk = false;
  try {
    urlHost = new URL(cleanedUrl).host;
    urlOk = /\.supabase\.co$/i.test(urlHost) || /\.supabase\.in$/i.test(urlHost);
  } catch (e) {
    urlOk = false;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    node: process.version,
    hasSupabaseUrl: Boolean(cleanedUrl),
    hasServiceRoleKey: Boolean(cleanedKey),
    supabaseUrlLength: cleanedUrl.length,
    serviceRoleKeyLength: cleanedKey.length,
    supabaseHost: urlHost,
    supabaseUrlLooksValid: urlOk,
    keyLooksLikeJwt: cleanedKey.startsWith('eyJ')
  }));
};
