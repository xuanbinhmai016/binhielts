import { S, skills } from './session.js';
import { $, button, paragraph } from './dom.js';
import { render } from './ui.js';

// A "set" = one core activity per skill (vocabulary drills are excluded). Derived from lessons.json.
export function mockSets() {
  const pool = skills.map(s => S.library.filter(l => l.mode === 'practice' && l.skill === s && l.question_type !== 'Vocabulary gap-fill'));
  const n = Math.min(...pool.map(p => p.length));
  return Array.from({ length: n }, (_, i) => pool.map(p => p[i]));
}

const state = () => S.mock || (S.mock = { set: 0, queue: [], pos: 0, results: [], active: false, done: false });

function start(rows) { const m = state(); m.queue = rows; m.pos = 0; m.results = []; m.active = true; m.done = false; render(); }

// Called by exam.js when a part is finished; adds the "next" button and records the result.
export function afterPart(work, row, correct) {
  const m = S.mock; if (!m?.active) return;
  m.results[m.pos] = { skill: row.skill, title: row.title, correct, total: row.questions.length };
  const last = m.pos >= m.queue.length - 1;
  work.append(button(last ? 'Finish and see results' : `Next part: ${m.queue[m.pos + 1].skill} →`, () => {
    if (last) { m.active = false; m.done = true; } else m.pos++;
    render();
  }));
}

export function renderMockPanel() {
  const host = $('mock-panel'); host.replaceChildren();
  const m = state(), sets = mockSets();
  const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'PRACTICE TEST';
  const h = document.createElement('h2');
  if (m.done) {
    h.textContent = 'Your results'; host.append(eyebrow, h);
    m.results.forEach(r => host.append(paragraph(r && r.total ? `${r.skill}: ${r.correct}/${r.total} on this exercise — ${r.title}.` : `${r?.skill}: completed — review your response against the self-review list. ${r?.title ?? ''}`, 'diagnostic-row')));
    host.append(paragraph('Results cover only these short original exercises. They are not an IELTS band score; Writing and Speaking are self-reviewed.', 'muted'),
      button('Back to test menu', () => { m.done = false; render(); }));
    return;
  }
  h.textContent = 'Choose a week'; host.append(eyebrow, h,
    paragraph('Each week has one activity per skill. Do a single part for focused practice, or start the full test and move through all four parts in order. Each part is timed; the timer starts when it opens. A green tick means you have completed that part.', 'muted'));
  const done = row => S.state.sessions.some(x => x.id === row.id);
  m.set = Math.min(m.set, sets.length - 1);
  sets.forEach((rows, i) => {
    const details = document.createElement('details'); details.className = 'mock-week'; details.open = i === m.set;
    details.addEventListener('toggle', () => { if (details.open) m.set = i; });
    const count = rows.filter(done).length;
    const summary = document.createElement('summary'); summary.textContent = `Week ${i + 1} · ${count}/${rows.length} completed`; details.append(summary);
    const list = document.createElement('div'); list.className = 'mock-parts';
    rows.forEach(row => {
      const item = document.createElement('div'); item.className = 'mock-part';
      const tick = document.createElement('span'); tick.className = done(row) ? 'tick done' : 'tick';
      tick.textContent = done(row) ? '\u2713' : ''; tick.setAttribute('aria-label', done(row) ? 'Completed' : 'Not completed yet');
      const text = document.createElement('div');
      const strong = document.createElement('strong'); strong.textContent = row.skill;
      const small = document.createElement('small'); small.textContent = `${row.title} \u00b7 ${row.minutes} min`;
      text.append(strong, small);
      item.append(tick, text, button('Do this part', () => start([row])));
      list.append(item);
    });
    const total = rows.reduce((t, r) => t + r.minutes, 0);
    details.append(list, button(`Start full test \u00b7 ${rows.length} parts \u00b7 about ${total} min`, () => start(rows)));
    host.append(details);
  });
}
