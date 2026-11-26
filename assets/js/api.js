import { S } from './session.js';
import { $, message } from './dom.js';

const base = () => (window.IELTS_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');
export const allowedBase = () => {
  try { const u = new URL(base()); return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)); }
  catch { return false; }
};
export function consentHint() { message('Working with AI. Your selected text/audio is being sent for this request.'); }

export async function api(path, payload, audio = false) {
  if (!allowedBase()) throw new Error('AI is not configured. Set a valid backend URL in assets/config.js.');
  if (!$('ai-consent').checked) throw new Error('Please read and select the consent checkbox before sending data.');
  const code = $('ai-code').value; if (!code) throw new Error('Enter the backend access code. Never enter an OpenAI API key here.');
  if (S.requestBusy) throw new Error('Please wait for the current AI request.');
  S.requestBusy = true; const abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 90000);
  try {
    const isForm = payload instanceof FormData;
    const res = await fetch(base() + path, { method: 'POST', headers: { 'X-Study-Code': code, ...(isForm ? {} : { 'Content-Type': 'application/json' }) }, body: isForm ? payload : JSON.stringify(payload), signal: abort.signal, credentials: 'omit' });
    if (!res.ok) { let error = 'AI request failed.'; try { error = (await res.json()).error || error; } catch {} throw new Error(error); }
    return audio ? await res.blob() : await res.json();
  } catch (e) { if (e.name === 'AbortError') throw new Error('AI request timed out. Try a shorter recording.'); throw e; }
  finally { S.requestBusy = false; clearTimeout(timeout); }
}

// Account requests (register/login/progress). Uses a bearer token, never the AI study code.
export async function authRequest(method, path, body) {
  if (!allowedBase()) throw Object.assign(new Error('Accounts are offline: the site owner has not set a backend URL in assets/config.js.'), { status: 0 });
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (S.authToken) headers.Authorization = 'Bearer ' + S.authToken;
  const abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const res = await fetch(base() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: abort.signal, credentials: 'omit' });
    let data = {}; try { data = await res.json(); } catch {}
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status });
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('The server did not respond in time.'), { status: 0 });
    if (e.status === undefined) throw Object.assign(new Error('Cannot reach the server.'), { status: 0 });
    throw e;
  } finally { clearTimeout(timeout); }
}
