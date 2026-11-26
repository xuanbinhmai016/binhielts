import { S, KEY, skills } from './session.js';
import { message } from './dom.js';

export const blank = () => ({ version: 2, target: '7', drafts: {}, sessions: [], diagnostic: {} });

export function valid(value) {
  const lib = S.library;
  if (!value || value.version !== 2 || !['5.5','6','6.5','7','7.5','8','8.5','9'].includes(value.target)) return false;
  if (!value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts)) return false;
  if (!Object.entries(value.drafts).every(([id, text]) => lib.some(l => l.id === id) && typeof text === 'string' && text.length <= 500000)) return false;
  if (!Array.isArray(value.sessions) || value.sessions.length > 10000 || !value.sessions.every(s => s && skills.includes(s.skill) && typeof s.date === 'string' && (s.correct === undefined || (Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= 5)))) return false;
  if (!value.diagnostic || typeof value.diagnostic !== 'object' || Array.isArray(value.diagnostic)) return false;
  return Object.entries(value.diagnostic).every(([id, d]) => lib.some(l => l.id === id && l.mode === 'diagnostic') && d && typeof d === 'object' && (d.correct === undefined || (Number.isInteger(d.correct) && d.correct >= 0 && d.correct <= 5)) && (d.reflection === undefined || ['Needs support','Somewhat comfortable','Comfortable'].includes(d.reflection)));
}

// Loads saved state (migrating v1 when possible). Returns a warning string or ''.
export function loadState() {
  S.state = blank();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (valid(saved)) S.state = saved;
    else {
      const old = JSON.parse(localStorage.getItem('ielts-studio-v1') || 'null');
      if (old && old.version === 1 && typeof old.draft === 'string' && Array.isArray(old.sessions)) {
        const migrated = { version: 2, target: old.target, drafts: { 'starter-writing': old.draft }, sessions: old.sessions, diagnostic: {} };
        if (valid(migrated)) S.state = migrated;
      }
    }
  } catch { return 'Browser storage is unavailable. Export backups to keep your work.'; }
  return '';
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S.state)); }
  catch { message('Cannot save locally. Export a study backup.'); }
  if (S.onChange) S.onChange();
  if (S.onSave) S.onSave();
}

export function log(row, correct) {
  S.state.sessions.push({ skill: row.skill, id: row.id, date: new Date().toISOString(), ...(correct === undefined ? {} : { correct }) });
  if (S.state.sessions.length > 10000) S.state.sessions.shift();
  save();
}

export function exportState() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(S.state, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'ielts-study-backup-v2.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reads and validates a backup file; returns normalised state (throws Error if invalid).
export async function parseBackup(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Backup exceeds 5 MB.');
  let value = JSON.parse(await file.text());
  if (value?.version === 1) value = { version: 2, target: value.target, drafts: { 'starter-writing': value.draft || '' }, sessions: value.sessions, diagnostic: {} };
  if (!valid(value)) throw new Error('Invalid study backup.');
  return {
    version: 2, target: value.target, drafts: Object.fromEntries(Object.entries(value.drafts)),
    sessions: value.sessions.map(s => ({ skill: s.skill, date: s.date, ...(typeof s.id === 'string' ? { id: s.id } : {}), ...(s.correct === undefined ? {} : { correct: s.correct }) })),
    diagnostic: Object.fromEntries(Object.entries(value.diagnostic).map(([id, d]) => [id, d.correct === undefined ? { reflection: d.reflection } : { correct: d.correct }])),
  };
}

export function resetState() {
  S.state = blank();
  try { localStorage.removeItem('ielts-studio-v1'); } catch {}
  save();
}
