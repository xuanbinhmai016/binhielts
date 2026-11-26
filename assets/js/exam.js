import { S, timed } from './session.js';
import { afterPart } from './mock.js';
import { $, message, button, paragraph } from './dom.js';
import { save, log } from './storage.js';
import { stopTimer } from './timer.js';
import { render, summary } from './ui.js';
import { renderSpeaking } from './media.js';

// Objective questions (Listening/Reading). Returns the function that finishes the attempt.
export function renderQuestions(work, row, host) {
  const form = document.createElement('form'), inputs = [];
  row.questions.forEach((q, i) => {
    const label = document.createElement('label'); label.htmlFor = 'answer-' + i; label.textContent = `${i + 1}. ${q.prompt}`;
    const input = document.createElement('input'); input.id = 'answer-' + i; input.type = 'text'; input.required = true; input.autocomplete = 'off'; inputs.push(input); form.append(label, input);
  });
  const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = timed() ? 'Finish mini test' : 'Check answers';
  const feedback = document.createElement('div'); feedback.className = 'feedback'; feedback.setAttribute('aria-live', 'polite'); form.append(submit, feedback);
  let finished = false;
  const check = () => {
    if (finished) return; finished = true; stopTimer(); submit.disabled = true; let correct = 0; feedback.replaceChildren();
    const norm = x => x.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
    row.questions.forEach((q, i) => { const ok = norm(inputs[i].value) === norm(q.answer); if (ok) correct++; inputs[i].disabled = true; feedback.append(paragraph(`${i + 1}. ${ok ? 'Correct' : 'Review'} — ${q.answer}. ${q.explanation}`)); });
    feedback.prepend(paragraph(`${correct}/${row.questions.length} on this exercise — not an IELTS band.`));
    if (host._transcript) host._transcript.hidden = false;
    log(row, correct);
    if (S.mode === 'diagnostic') {
      S.state.diagnostic[row.id] = { correct }; save(); summary();
      work.append(button(S.diagnosticIndex < 3 ? 'Next diagnostic step' : 'View completed profile', () => {
        if (S.diagnosticIndex < 3) { S.diagnosticIndex++; render(); } else { $('diagnostic-summary').scrollIntoView({ block: 'start' }); }
      }));
    } else if (S.mode === 'mock') afterPart(work, row, correct);
    else work.append(button('Try this activity again', render));
  };
  form.onsubmit = e => { e.preventDefault(); check(); };
  work.append(form);
  return check;
}

// Writing / Speaking: open responses with self-review. Returns the time-expiry handler.
export function renderOpenResponse(work, row, clock, token) {
  if (row.skill === 'Writing') {
    const label = document.createElement('label'); label.htmlFor = 'draft'; label.textContent = 'Your response';
    const draft = document.createElement('textarea'); draft.id = 'draft'; draft.maxLength = 500000; draft.value = S.state.drafts[row.id] || '';
    const count = paragraph('');
    const update = () => { const n = draft.value.trim() ? draft.value.trim().split(/\s+/).length : 0; count.textContent = `${n} words · ${S.mode === 'diagnostic' ? 'Aim for 80–120' : row.title.includes('Task 1') ? 'Aim for at least 150' : 'Aim for at least 250'}`; };
    draft.oninput = () => { S.state.drafts[row.id] = draft.value; save(); update(); }; update(); work.append(label, draft, count);
  }
  if (row.skill === 'Speaking') renderSpeaking(work, row, token, clock);
  const review = document.createElement('h3'); review.textContent = 'Self-review'; work.append(review);
  const items = row.skill === 'Writing' ? ['I answered the prompt clearly.', 'I organised ideas with reasons or examples.', 'I checked vocabulary, grammar and punctuation.'] : ['My message is understandable.', 'I can connect ideas without reading a script.', 'I can identify words or pauses to practise.'];
  items.forEach(text => { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; label.append(input, document.createTextNode(' ' + text)); work.append(label); });
  const reflection = document.createElement('select'); reflection.setAttribute('aria-label', 'How comfortable did you feel?');
  ['Needs support', 'Somewhat comfortable', 'Comfortable'].forEach(text => { const opt = document.createElement('option'); opt.textContent = text; reflection.append(opt); });
  work.append(paragraph('How comfortable did you feel?'), reflection);
  const finish = button(S.mode === 'diagnostic' ? 'Save reflection and continue' : 'Log practice', () => {
    stopTimer(); log(row);
    if (S.mode === 'diagnostic') {
      S.state.diagnostic[row.id] = { reflection: reflection.value }; save();
      if (S.diagnosticIndex < 3) { S.diagnosticIndex++; render(); } else { summary(); message('Starting-point profile complete. Review your recommendations above.'); finish.disabled = true; }
    } else if (S.mode === 'mock') { finish.disabled = true; message('Part logged.'); afterPart(work, row); }
    else { finish.disabled = true; message('Practice logged. You can choose another activity.'); }
  }); work.append(finish);
  return () => message('Time finished. Review your response and press Log practice or Save reflection.');
}
