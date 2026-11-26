import { S } from './session.js';
import { $, message } from './dom.js';
import { loadLessons } from './data.js';
import { loadState } from './storage.js';
import { overview, render, initControls } from './ui.js';
import { initAccount } from './account.js';

async function boot() {
  try { S.library = await loadLessons(); }
  catch (e) { $('lesson').textContent = e.message; message(e.message); return; }
  S.diagnostic = S.library.filter(l => l.mode === 'diagnostic');
  const warning = loadState();
  S.onChange = overview;
  initControls();
  render();
  if (warning) message(warning);
  await initAccount();
}
boot();
