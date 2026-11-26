import { S } from './session.js';
import { $, message } from './dom.js';
import { authRequest, allowedBase } from './api.js';
import { valid, save, resetState } from './storage.js';
import { render } from './ui.js';

const AUTH_KEY = 'ielts-auth-v1';
let auth = null, pushTimer = null, suppress = false;

function loadAuth() {
  try { const a = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); if (a && typeof a.token === 'string' && typeof a.username === 'string') auth = a; } catch {}
  S.authToken = auth?.token ?? null;
}
function setAuth(next) {
  auth = next; S.authToken = next?.token ?? null;
  try { next ? localStorage.setItem(AUTH_KEY, JSON.stringify(next)) : localStorage.removeItem(AUTH_KEY); } catch {}
  paint();
}

function paint() {
  const online = allowedBase();
  $('account-button').textContent = auth ? `Account: ${auth.username}` : 'Log in / Sign up';
  $('account-form').hidden = !!auth; $('account-signed-in').hidden = !auth;
  $('account-welcome').textContent = auth ? `Signed in as ${auth.username}. Your progress is saved to your account automatically.` : '';
  $('account-note').textContent = online
    ? 'Create an account to keep your progress across devices. Scores and drafts are stored on the site owner\u2019s server. Do not reuse a password from another site.'
    : 'Accounts are offline until the site owner deploys the backend and sets API_BASE_URL in assets/config.js. Your progress is still saved in this browser.';
  ['acc-login', 'acc-register'].forEach(id => $(id).disabled = !online);
}

const hasData = s => s.sessions.length || Object.keys(s.drafts).length || Object.keys(s.diagnostic).length;

// Combine browser progress with account progress without losing either side.
export function mergeProgress(local, remote) {
  const seen = new Set(), sessions = [];
  for (const s of [...remote.sessions, ...local.sessions]) {
    const key = `${s.skill}|${s.id ?? ''}|${s.date}`;
    if (!seen.has(key)) { seen.add(key); sessions.push(s); }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  const drafts = { ...remote.drafts };
  for (const [id, text] of Object.entries(local.drafts)) if (!(id in drafts) || text.length > drafts[id].length) drafts[id] = text;
  const merged = { version: 2, target: remote.target, drafts, sessions: sessions.slice(-10000), diagnostic: { ...local.diagnostic, ...remote.diagnostic } };
  return valid(merged) ? merged : remote;
}

async function pushNow() {
  clearTimeout(pushTimer); pushTimer = null;
  if (!auth) return;
  try { await authRequest('PUT', '/auth/progress', { progress: S.state }); }
  catch (e) { handleError(e, 'Could not sync with your account'); }
}
function handleError(e, prefix) {
  if (e.status === 401) { setAuth(null); message('Your session expired. Log in again to keep syncing.'); }
  else message(`${prefix}: ${e.message}`);
}

async function pullAndMerge() {
  const { progress: remote } = await authRequest('GET', '/auth/progress');
  if (remote && valid(remote)) {
    const merged = hasData(S.state) ? mergeProgress(S.state, remote) : remote;
    if (JSON.stringify(merged) !== JSON.stringify(S.state)) { suppress = true; S.state = merged; save(); suppress = false; render(); }
    if (JSON.stringify(merged) !== JSON.stringify(remote)) await pushNow();
  } else await pushNow();
}

async function submit(kind) {
  const username = $('acc-user').value.trim(), password = $('acc-pass').value;
  if (!username || !password) { message('Enter a username and password.'); return; }
  $('acc-login').disabled = $('acc-register').disabled = true;
  try {
    const result = await authRequest('POST', '/auth/' + kind, { username, password });
    setAuth({ token: result.token, username: result.username });
    $('acc-pass').value = '';
    await pullAndMerge();
    message(kind === 'register' ? 'Account created. Your progress is now saved to it.' : 'Logged in. Your progress is synced.');
  } catch (e) { message(e.message); }
  finally { paint(); }
}

async function logout() {
  if (pushTimer) await pushNow();
  try { await authRequest('POST', '/auth/logout'); } catch {}
  setAuth(null);
  // Clear this browser's copy so the next person on a shared device starts fresh; progress stays on the server.
  suppress = true; resetState(); suppress = false; render();
  message('Logged out. Your progress stays in your account.');
}

async function deleteAccount() {
  if (!confirm('Delete your account and its saved progress permanently? Progress in this browser is kept.')) return;
  try { await authRequest('DELETE', '/auth/me'); setAuth(null); message('Account deleted.'); }
  catch (e) { handleError(e, 'Could not delete the account'); }
}

export async function initAccount() {
  loadAuth();
  S.onSave = () => { if (!auth || suppress) return; clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 1500); };
  $('account-button').onclick = () => { const p = $('account-panel'); p.hidden = !p.hidden; if (!p.hidden) { paint(); p.scrollIntoView?.({ block: 'start' }); ($('acc-user').offsetParent ? $('acc-user') : $('acc-logout')).focus(); } };
  $('acc-close').onclick = $('acc-close-2').onclick = () => { $('account-panel').hidden = true; $('account-button').focus(); };
  $('account-form').onsubmit = e => { e.preventDefault(); submit('login'); };
  $('acc-register').onclick = () => { if ($('account-form').reportValidity()) submit('register'); };
  $('acc-logout').onclick = logout;
  $('acc-delete').onclick = deleteAccount;
  paint();
  if (auth && allowedBase()) { try { await pullAndMerge(); } catch (e) { if (e.status === 401) handleError(e); } }
}
