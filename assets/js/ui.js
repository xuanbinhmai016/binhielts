import { S, skills, modes, timed } from './session.js';
import { renderMockPanel } from './mock.js';
import { $, message, button, paragraph } from './dom.js';
import { save, exportState, parseBackup, resetState } from './storage.js';
import { api, allowedBase, consentHint } from './api.js';
import { timerUI } from './timer.js';
import { cleanup, renderListening } from './media.js';
import { renderQuestions, renderOpenResponse } from './exam.js';

export function overview() {
  $('progress').textContent = `${S.state.sessions.length} practice attempts logged · ${Object.keys(S.state.diagnostic).length}/4 diagnostic steps completed`;
  $('target').value = S.state.target;
  skills.forEach(s => $('count-' + s).textContent = S.state.sessions.filter(x => x.skill === s).length);
}

const current = () => S.mode === 'diagnostic' ? S.diagnostic[S.diagnosticIndex]
  : (S.mode === 'mock' && S.mock?.active) ? S.mock.queue[S.mock.pos]
  : S.library.find(x => x.id === S.selected);
export function setMode(value) { if (S.mock) { S.mock.active = false; S.mock.done = false; } S.mode = value; S.diagnosticIndex = 0; render(); }
function changeSkill(value) { S.skill = value; S.selected = S.library.find(x => x.skill === S.skill && x.mode === 'practice').id; render(); }

export function summary() {
  const host = $('diagnostic-summary'); host.replaceChildren();
  host.hidden = S.mode !== 'diagnostic'; if (host.hidden) return;
  const heading = document.createElement('h3'); heading.textContent = 'Your starting-point profile'; host.append(heading);
  S.diagnostic.forEach(row => {
    const result = S.state.diagnostic[row.id];
    let text = `${row.skill}: not completed yet.`;
    if (result && row.questions.length) {
      const recommendation = result.correct <= 2 ? 'Start with short guided exercises.' : result.correct <= 4 ? 'Practise accuracy and review missed answers.' : 'Try longer practice next; this short sample does not establish an overall level.';
      text = `${row.skill}: ${result.correct}/${row.questions.length} on this exercise. ${recommendation}`;
    } else if (result) text = `${row.skill}: self-reflection — ${result.reflection}. ${result.reflection === 'Needs support' ? 'Begin with short responses and a model structure.' : 'Continue practising and review your response.'}`;
    host.append(paragraph(text, 'diagnostic-row'));
  });
  host.append(paragraph('This is a short, unvalidated starting-point check. It does not determine your overall English ability, CEFR level or IELTS band. Writing and speaking use self-reflection, not objective scores.', 'muted'));
  if (Object.keys(S.state.diagnostic).length === 4) host.append(button('Continue with daily practice', () => setMode('practice')));
}

export function render() {
  cleanup(); overview(); summary();
  const oldNotice = $('activity-opened'); if (oldNotice) oldNotice.remove();
  document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  $('mode-help').textContent = modes.find(m => m.id === S.mode).note + '. Original short activities, not a full examination.';
  $('section-title').textContent = modes.find(m => m.id === S.mode).title;
  const menu = S.mode === 'mock' && !S.mock?.active;
  $('skills').hidden = S.mode === 'diagnostic' || S.mode === 'coach' || S.mode === 'mock';
  $('lesson-picker').hidden = S.mode === 'diagnostic' || S.mode === 'coach' || S.mode === 'mock';
  $('coach-panel').hidden = S.mode !== 'coach'; $('mock-panel').hidden = !menu;
  $('lesson').hidden = S.mode === 'coach' || menu;
  document.querySelectorAll('#skills button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.skill === S.skill)));
  if (S.mode === 'coach') return;
  if (menu) { renderMockPanel(); return; }
  const available = S.library.filter(l => l.mode === 'practice' && l.skill === S.skill);
  $('lesson-select').replaceChildren(); available.forEach(l => { const option = document.createElement('option'); option.value = l.id; option.textContent = l.title; $('lesson-select').append(option); }); $('lesson-select').value = S.selected;
  const row = current(), host = $('lesson'); host.replaceChildren(); if (!row) return;
  const token = S.generation;
  const heading = document.createElement('h2'); heading.id = 'lesson-title'; heading.textContent = row.title; host.append(heading, paragraph(row.instructions));
  if (S.mode === 'diagnostic') host.prepend(paragraph(`Step ${S.diagnosticIndex + 1} of 4 · ${row.skill}`, 'diagnostic-step'));
  if (S.mode === 'mock') {
    const bar = document.createElement('div'); bar.className = 'mock-bar';
    bar.append(paragraph(`Practice test · Part ${S.mock.pos + 1} of ${S.mock.queue.length} · ${row.skill}`, 'diagnostic-step'), button('Exit test', () => { S.mock.active = false; render(); }));
    host.prepend(bar);
  }
  if (timed()) host.append(paragraph(`Timed mini test: ${row.minutes} minutes. The timer starts now. Final review appears after submission. Answer keys are public in this study app; this is not a secure examination.`, 'test-notice'));
  let finishTest = null;
  const clock = timerUI(host, row.minutes * 60, () => { if (timed() && finishTest) finishTest(); });
  const passage = document.createElement('div'); passage.className = 'passage'; passage.textContent = row.content;

  // Reading/Writing use a computer-test style split screen (source left, work right).
  let work = host;
  if (row.skill === 'Listening') renderListening(host, row, heading, passage, token);
  else if (row.skill === 'Reading' || row.skill === 'Writing') {
    const split = document.createElement('div'); split.className = 'exam-split';
    const left = document.createElement('div'); left.className = 'pane-source'; left.append(passage);
    work = document.createElement('div'); work.className = 'pane-work';
    split.append(left, work); host.append(split);
  } else host.append(passage);

  if (row.questions.length) finishTest = renderQuestions(work, row, host);
  else finishTest = renderOpenResponse(work, row, clock, token);
  if (timed()) clock.start();
}

export function initControls() {
  $('next-activity-button').onclick = () => {
    const activities = S.library.filter(item => item.mode === 'practice' && item.skill === S.skill);
    if (!activities.length) { message('No activities are available for this skill.'); return; }
    const index = S.mode === 'practice' ? activities.findIndex(item => item.id === S.selected) : -1;
    const next = activities[(index + 1) % activities.length];
    if (S.mock) { S.mock.active = false; S.mock.done = false; }
    S.mode = 'practice'; S.diagnosticIndex = 0; S.selected = next.id; render();
    let notice = $('activity-opened');
    if (!notice) { notice = paragraph('', 'activity-opened'); notice.id = 'activity-opened'; notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite'); $('section-title').insertAdjacentElement('afterend', notice); }
    notice.textContent = `Opened ${next.skill}: ${next.title}. Activity ${activities.findIndex(item => item.id === next.id) + 1} of ${activities.length}.`;
    const panel = $('practice'); panel.setAttribute('tabindex', '-1');
    panel.focus({ preventScroll: true });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  modes.forEach(m => {
    const b = button('', () => setMode(m.id)); b.dataset.mode = m.id; b.dataset.step = String(modes.findIndex(item => item.id === m.id) + 1).padStart(2, '0');
    const title = document.createElement('strong'); title.textContent = m.title; const small = document.createElement('small'); small.textContent = m.note; b.append(title, small); $('modes').append(b);
  });
  const notes = { Listening: 'Tune in and understand', Reading: 'Discover ideas in text', Writing: 'Put your ideas into words', Speaking: 'Find your speaking voice' };
  skills.forEach(name => { const b = button(name, () => changeSkill(name)); b.dataset.skill = name; b.dataset.icon = name[0]; b.dataset.note = notes[name]; b.setAttribute('aria-label', name + ': ' + notes[name]); $('skills').append(b); });
  $('lesson-select').onchange = e => { S.selected = e.target.value; render(); };
  $('target').onchange = e => { S.state.target = e.target.value; save(); };
  $('ai-connection').textContent = allowedBase() ? 'Backend URL configured. An access code and consent are still required. Live connection has not been checked.' : 'AI is offline until the owner deploys the backend and sets API_BASE_URL in assets/config.js. Other practice works without AI.';
  $('ask-coach').onclick = async () => {
    const text = $('coach-question').value.trim(); if (!text) { message('Type a question first.'); return; }
    try { consentHint(); const result = await api('/api/coach', { skill: $('coach-skill').value, text }); $('coach-answer').textContent = result.feedback; message('AI reply ready. Treat it as provisional guidance.'); } catch (e) { message(e.message); }
  };
  $('export').onclick = exportState;
  $('import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const next = await parseBackup(file);
      if (!confirm('Replace current study data? Export a backup first.')) return;
      S.state = next; save(); render(); message('Study backup imported.');
    } catch (err) { message(err.message); } finally { e.target.value = ''; }
  };
  $('reset').onclick = () => { if (confirm('Delete drafts, diagnostic results and progress?')) { resetState(); render(); message('Study data reset.'); } };
  ['large-text', 'high-contrast'].forEach(id => {
    const b = $(id); let enabled = false;
    try { enabled = localStorage.getItem('ielts-display-' + id) === 'true'; } catch {}
    document.body.classList.toggle(id, enabled); b.setAttribute('aria-pressed', String(enabled));
    b.onclick = () => { const active = document.body.classList.toggle(id); b.setAttribute('aria-pressed', String(active)); try { localStorage.setItem('ielts-display-' + id, String(active)); } catch {} };
  });
  window.addEventListener('pagehide', cleanup);
}
