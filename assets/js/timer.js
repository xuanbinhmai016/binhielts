import { S } from './session.js';
import { message } from './dom.js';

export function stopTimer() { clearInterval(S.timer); S.timer = null; S.deadline = null; }

export function timerUI(host, duration, onExpire) {
  S.seconds = duration;
  const panel = document.createElement('div');
  panel.innerHTML = '<p class="timer" role="timer"></p><button type="button">Start timer</button><button type="button" class="secondary">Pause</button><button type="button" class="secondary">Restart</button>';
  const display = panel.querySelector('p'), buttons = panel.querySelectorAll('button');
  const paint = () => display.textContent = `${Math.floor(S.seconds / 60)}:${String(S.seconds % 60).padStart(2, '0')}`;
  paint(); host.append(panel);
  buttons[0].onclick = () => {
    if (S.timer || S.seconds <= 0) return; S.deadline = Date.now() + S.seconds * 1000;
    S.timer = setInterval(() => { S.seconds = Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000)); paint(); if (!S.seconds) { stopTimer(); message('Time is up.'); if (onExpire) onExpire(); } }, 250);
  };
  buttons[1].onclick = () => { if (S.deadline) S.seconds = Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000)); stopTimer(); paint(); };
  buttons[2].onclick = () => { stopTimer(); S.seconds = duration; paint(); };
  return { start: () => buttons[0].click(), setDuration: n => { stopTimer(); S.seconds = n; duration = n; paint(); } };
}
