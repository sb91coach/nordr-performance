/**
 * NORDR admin session helpers.
 * Security boundary is Supabase RLS + admin_users — not client-side email checks alone.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

let cachedClient = null;
let cachedConfig = null;

export async function loadAdminConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await fetch('/api/admin/config', { credentials: 'same-origin' });
  const data = await res.json().catch(function () { return null; });
  if (!res.ok || !data || !data.ok) {
    throw new Error((data && data.error) || 'Unable to load admin configuration.');
  }
  cachedConfig = data;
  return data;
}

export async function getSupabase() {
  if (cachedClient) return cachedClient;
  const cfg = await loadAdminConfig();
  cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'nordr-admin-auth'
    }
  });
  return cachedClient;
}

export async function getSession() {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function isAuthorisedAdmin(userId) {
  if (!userId) return false;
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data && data.user_id);
}

/**
 * Ensures a valid admin session. Redirects to login when not authorised.
 * @returns {{ supabase: object, session: object, user: object }}
 */
export async function requireAdmin() {
  const sb = await getSupabase();
  const session = await getSession();
  if (!session || !session.user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace('/admin/login?next=' + next);
    return null;
  }
  const ok = await isAuthorisedAdmin(session.user.id);
  if (!ok) {
    await sb.auth.signOut();
    window.location.replace('/admin/login?error=unauthorised');
    return null;
  }
  return { supabase: sb, session: session, user: session.user };
}

export async function loginWithPassword(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: String(email || '').trim().toLowerCase(),
    password: String(password || '')
  });
  if (error) {
    const msg = error.message || '';
    if (/invalid login credentials/i.test(msg) || error.status === 400) {
      throw new Error('Invalid email or password.');
    }
    throw new Error('Unable to sign in. Please try again.');
  }
  const user = data.user || (data.session && data.session.user);
  if (!user) throw new Error('Unable to sign in. Please try again.');
  const ok = await isAuthorisedAdmin(user.id);
  if (!ok) {
    await sb.auth.signOut();
    throw new Error('This account is not authorised for NORDR admin access.');
  }
  return data.session;
}

export async function logoutAdmin() {
  const sb = await getSupabase();
  await sb.auth.signOut();
  window.location.replace('/admin/login');
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showError(el, message) {
  if (!el) return;
  el.className = 'error-state';
  el.textContent = message || 'Unable to load. Please try again.';
}

export const ENGAGEMENT_STATUSES = [
  'New',
  'Reviewed',
  'Discovery Booked',
  'Diagnostic Proposed',
  'Active',
  'Closed'
];

export const LEAD_SOURCES = [
  'Direct',
  'LinkedIn',
  'Instagram',
  'Referral',
  'Website',
  'Other'
];

export const SECTORS = [
  'Emergency Services',
  'Defence',
  'Aviation/Aerospace',
  'Motorsport',
  'High Performance Sport',
  'Corporate/Executive',
  'Industrial/High Risk',
  'Other'
];

export const DIMENSIONS = [
  'objective',
  'system',
  'human',
  'evidence',
  'decision',
  'outcome'
];

export const DIM_LABELS = {
  objective: 'Objective',
  system: 'System',
  human: 'Human',
  evidence: 'Evidence',
  decision: 'Decision',
  outcome: 'Outcome'
};

export const DO_NOT_ASSUME = [
  'existing provision is ineffective',
  'services are disconnected',
  'additional services are required',
  'lack of respondent visibility means a process does not exist',
  'association equals causation',
  'one respondent represents the entire organisation'
];
