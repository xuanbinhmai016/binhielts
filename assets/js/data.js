import { skills } from './session.js';

// Single source of truth: backend/lessons.json (also used by server.js and ielts_tools/).
const LESSONS_URL = new URL('../../backend/lessons.json', import.meta.url);

export async function loadLessons() {
  let res;
  try { res = await fetch(LESSONS_URL); }
  catch { throw new Error('Cannot load lessons. Serve the folder over HTTP (python -m http.server 8000); opening index.html directly does not work.'); }
  if (!res.ok) throw new Error(`Cannot load lessons (HTTP ${res.status}).`);
  const data = await res.json();
  const ok = Array.isArray(data) && data.length && data.every(l =>
    l && typeof l.id === 'string' && skills.includes(l.skill) && typeof l.title === 'string' &&
    typeof l.content === 'string' && Array.isArray(l.questions));
  if (!ok) throw new Error('lessons.json has an unexpected format.');
  return data;
}
