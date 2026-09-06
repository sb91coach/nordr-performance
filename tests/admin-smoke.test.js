'use strict';

/**
 * Lightweight smoke checks for the admin workbench static surface.
 * Does not require a live Supabase session.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const requiredFiles = [
  'admin/index.html',
  'admin/login/index.html',
  'admin/leads/index.html',
  'admin/leads/detail/index.html',
  'assets/admin.css',
  'assets/admin-core.js',
  'assets/admin-home.js',
  'assets/admin-leads.js',
  'assets/admin-lead-detail.js',
  'assets/admin-login.js',
  'assets/admin-methodology.js',
  'api/admin/config.js',
  'supabase/migrations/004_admin_workbench.sql',
  'ADMIN_SETUP.md'
];

requiredFiles.forEach(function (rel) {
  assert(fs.existsSync(path.join(root, rel)), 'exists ' + rel);
});

const migration = read('supabase/migrations/004_admin_workbench.sql');
assert(migration.includes('create table if not exists public.admin_users'), 'migration defines admin_users');
assert(migration.includes('create table if not exists public.consultancy_cases'), 'migration defines consultancy_cases');
assert(migration.includes('is_nordr_admin'), 'migration defines is_nordr_admin');
assert(migration.includes('ensure_consultancy_case_for_submission'), 'migration auto-creates consultancy cases');
assert(migration.includes("engagement_status in ("), 'migration constrains engagement_status');
assert(!/to anon/.test(migration) || migration.includes('revoke all on table public.admin_users from anon'), 'admin_users revokes anon');

const config = read('api/admin/config.js');
assert(config.includes('SUPABASE_ANON_KEY'), 'config exposes anon key env');
assert(!config.includes('SERVICE_ROLE'), 'config does not reference service role');
assert(config.includes('supabaseAnonKey'), 'config returns supabaseAnonKey');

const vercel = read('vercel.json');
assert(vercel.includes('/admin/leads/:id'), 'vercel rewrites lead detail URLs');

const detail = read('assets/admin-lead-detail.js');
assert(detail.includes('null / not scored'), 'Unsure shown as null / not scored');
assert(detail.includes('Do not assume') || detail.includes('DO_NOT_ASSUME'), 'discovery brief includes do-not-assume');
assert(detail.includes('consultancy_cases'), 'detail updates consultancy_cases');

const methodology = read('assets/admin-methodology.js');
assert(methodology.includes("E: 'Unsure'"), 'methodology includes Unsure wording');
assert(methodology.includes("id: 'OBJ-01'"), 'methodology includes twelve questions');

['admin/index.html', 'admin/login/index.html', 'admin/leads/index.html', 'admin/leads/detail/index.html'].forEach(function (rel) {
  const html = read(rel);
  assert(html.includes('noindex'), rel + ' is noindex');
  assert(!/service_role|SERVICE_ROLE|eyJ/.test(html), rel + ' has no embedded secrets');
});

const login = read('assets/admin-login.js');
assert(login.includes('loginWithPassword'), 'login uses password auth');
assert(!login.includes('signUp'), 'login does not offer sign-up');

if (failed) {
  console.error('\n' + failed + ' admin smoke check(s) failed');
  process.exit(1);
}
console.log('\nAll admin smoke checks passed');
