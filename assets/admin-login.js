import { getSession, isAuthorisedAdmin, loginWithPassword, getSupabase } from './admin-core.js';

function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setFlash(message, isError) {
  const el = document.getElementById('login-flash');
  if (!message) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.className = isError ? 'flash' : 'flash ok';
  el.textContent = message;
}

async function redirectIfAuthed() {
  try {
    const session = await getSession();
    if (!session || !session.user) return;
    const ok = await isAuthorisedAdmin(session.user.id);
    if (!ok) {
      const sb = await getSupabase();
      await sb.auth.signOut();
      return;
    }
    const next = queryParam('next');
    window.location.replace(next && next.startsWith('/admin') ? next : '/admin');
  } catch (e) {
    // stay on login
  }
}

const err = queryParam('error');
if (err === 'unauthorised') {
  setFlash('This account is not authorised for NORDR admin access.', true);
}

redirectIfAuthed();

document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  setFlash('');
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await loginWithPassword(email, password);
    const next = queryParam('next');
    window.location.replace(next && next.startsWith('/admin') ? next : '/admin');
  } catch (err) {
    setFlash(err.message || 'Unable to sign in. Please try again.', true);
    btn.disabled = false;
  }
});
