import { S, timed } from './session.js';
import { $, message, button, paragraph } from './dom.js';
import { api, consentHint } from './api.js';
import { stopTimer } from './timer.js';

export function cleanup() {
  S.generation++; stopTimer();
  $('lesson')?.querySelectorAll('audio').forEach(audio => audio.pause());
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (S.recorder && S.recorder.state !== 'inactive') S.recorder.stop();
  if (S.stream) S.stream.getTracks().forEach(t => t.stop());
  S.stream = null; S.recorder = null; S.clip = null;
  if (S.clipUrl) URL.revokeObjectURL(S.clipUrl); S.clipUrl = null;
  if (S.aiAudioUrl) URL.revokeObjectURL(S.aiAudioUrl); S.aiAudioUrl = null;
}

export function renderListening(host, row, heading, passage, token) {
  const audioPanel = document.createElement('section');
  audioPanel.className = 'listening-audio-panel';
  audioPanel.setAttribute('aria-label', 'Listening audio');
  const audioTitle = document.createElement('h3'); audioTitle.textContent = 'Listening audio';
  const audioStatus = paragraph('Ready. Press Play listening audio to begin.', 'audio-status');
  audioStatus.setAttribute('role', 'status'); audioStatus.setAttribute('aria-live', 'polite');
  const controls = document.createElement('div'); controls.className = 'audio-controls';
  const speedLabel = document.createElement('label'); speedLabel.htmlFor = 'listening-speed'; speedLabel.textContent = 'Speed · applies on next Play';
  const speed = document.createElement('select'); speed.id = 'listening-speed';
  [[.75, 'Slower · 0.75×'], [.85, 'Steady · 0.85×'], [1, 'Normal · 1×']].forEach(([value, text]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = text; speed.append(option);
  }); speed.value = '0.85';
  const generated = document.createElement('audio'); generated.controls = true; generated.hidden = true;
  generated.setAttribute('aria-label', 'AI-generated listening audio');
  let speechGeneration = 0, activeUtterance = null;
  const supported = () => ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  const stopSpeech = () => { speechGeneration++; activeUtterance = null; if (supported()) speechSynthesis.cancel(); };
  generated.addEventListener('play', () => { stopSpeech(); audioStatus.textContent = 'Playing AI-generated audio.'; });
  generated.addEventListener('error', () => { audioStatus.textContent = 'AI audio could not load. Try browser audio instead.'; });
  controls.append(button('Play listening audio', () => {
    if (!supported()) { audioStatus.textContent = 'Browser speech is unavailable. Try another browser or use AI audio below if configured.'; return; }
    try {
      generated.pause(); stopSpeech(); const speechToken = speechGeneration;
      const utterance = new SpeechSynthesisUtterance(row.content); activeUtterance = utterance;
      utterance.lang = 'en-GB'; utterance.rate = Number(speed.value);
      utterance.onstart = () => { if (token === S.generation && speechToken === speechGeneration) audioStatus.textContent = 'Playing listening audio.'; };
      utterance.onend = () => { if (token === S.generation && speechToken === speechGeneration) { activeUtterance = null; audioStatus.textContent = 'Finished. Press Play to listen again.'; } };
      utterance.onerror = () => { if (token === S.generation && speechToken === speechGeneration) audioStatus.textContent = 'Audio could not play. Check device volume and try another browser.'; };
      audioStatus.textContent = 'Starting browser audio…'; speechSynthesis.speak(utterance);
    } catch { audioStatus.textContent = 'Audio is blocked. Check browser settings or try another browser.'; }
  }), button('Pause', () => {
    if (supported() && activeUtterance) { speechSynthesis.pause(); audioStatus.textContent = 'Paused. Press Resume to continue.'; }
  }), button('Resume', () => {
    if (supported() && activeUtterance) { speechSynthesis.resume(); audioStatus.textContent = 'Resuming audio.'; }
  }), button('Stop', () => {
    stopSpeech(); generated.pause(); if (generated.src) generated.currentTime = 0;
    audioStatus.textContent = 'Stopped. Play starts from the beginning.';
  }));
  audioPanel.append(audioTitle, paragraph('Listen first, then answer the questions below. Browser speech works without an AI key where supported.', 'muted'), controls, speedLabel, speed, audioStatus);
  const aiDetails = document.createElement('details');
  const aiSummary = document.createElement('summary'); aiSummary.textContent = 'Optional AI audio · backend setup required';
  const generate = button('Generate AI audio', async () => {
    generate.disabled = true; audioStatus.textContent = 'Requesting AI audio…';
    try {
      consentHint(); const blob = await api('/api/listening', { lessonId: row.id }, true);
      if (token !== S.generation) return;
      stopSpeech(); generated.pause(); if (S.aiAudioUrl) URL.revokeObjectURL(S.aiAudioUrl);
      S.aiAudioUrl = URL.createObjectURL(blob); generated.src = S.aiAudioUrl; generated.hidden = false;
      audioStatus.textContent = 'AI audio ready. Press play on the audio player below.';
    } catch (e) { if (token === S.generation) { audioStatus.textContent = e.message; message(e.message); } }
    finally { generate.disabled = false; }
  });
  aiDetails.append(aiSummary, paragraph('Requires your configured backend and consent. The player appears after audio is generated.', 'muted'), generate, generated);
  audioPanel.append(aiDetails, paragraph('Both options use synthetic voices for original passages, not Cambridge recordings.', 'muted'));
  host.insertBefore(audioPanel, heading.nextSibling);
  const details = document.createElement('details'), summaryNode = document.createElement('summary'); summaryNode.textContent = 'Review transcript'; details.append(summaryNode, passage);
  if (timed() || S.mode === 'diagnostic') details.hidden = true; host.append(details); host._transcript = details;
}

export function renderSpeaking(host, row, token, clock) {
  const MAX = 10 * 1024 * 1024;
  host.append(button('Use 2-minute speaking timer', () => clock.setDuration(120)));
  const start = button('Start recording', async () => {
    if (S.pendingRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { message('Use HTTPS/localhost and a supported browser, or upload an audio file.'); return; }
    S.pendingRecording = true; start.disabled = true;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== S.generation) { acquired.getTracks().forEach(t => t.stop()); return; }
      S.stream = acquired; const chunks = []; const rec = new MediaRecorder(acquired); S.recorder = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        acquired.getTracks().forEach(t => t.stop()); if (token !== S.generation) return;
        S.clip = new Blob(chunks, { type: rec.mimeType || chunks[0]?.type || 'audio/webm' });
        if (S.clipUrl) URL.revokeObjectURL(S.clipUrl); S.clipUrl = URL.createObjectURL(S.clip); player.src = S.clipUrl; download.href = S.clipUrl;
        download.download = S.clip.type.includes('mp4') ? 'practice.m4a' : S.clip.type.includes('ogg') ? 'practice.ogg' : 'practice.webm';
        download.hidden = false; start.disabled = false; stop.disabled = true; S.stream = null;
        message('Recording stays local until you request AI feedback. Download before switching activities.');
      }; rec.start(); stop.disabled = false; message('Recording locally. Press Stop recording when finished.');
    } catch { if (S.stream) S.stream.getTracks().forEach(t => t.stop()); S.stream = null; start.disabled = false; message('Microphone unavailable. Check permissions or upload a recording.'); }
    finally { S.pendingRecording = false; }
  });
  const stop = button('Stop recording', () => { if (S.recorder && S.recorder.state !== 'inactive') S.recorder.stop(); }); stop.disabled = true;
  const player = document.createElement('audio'); player.controls = true;
  const download = document.createElement('a'); download.textContent = 'Download recording'; download.hidden = true;
  host.append(start, stop, player, download);
  const uploadLabel = document.createElement('label'); uploadLabel.textContent = 'Or select your own recording (maximum 10 MB)';
  const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg,.m4a,.mp3,.wav,.webm,.ogg'; uploadLabel.append(upload);
  upload.onchange = () => {
    const file = upload.files[0]; if (!file) return;
    if (file.size > MAX) { message('Choose an audio file smaller than 10 MB.'); return; }
    S.clip = file; if (S.clipUrl) URL.revokeObjectURL(S.clipUrl); S.clipUrl = URL.createObjectURL(S.clip); player.src = S.clipUrl; message('Audio selected locally. It is not uploaded yet.');
  }; host.append(uploadLabel);
  const response = paragraph('', 'ai-feedback'); response.setAttribute('aria-live', 'polite');
  host.append(button('Get AI speaking feedback', async () => {
    if (!S.clip) { message('Record or select an audio file first.'); return; }
    if (S.clip.size > MAX) { message('Recording exceeds 10 MB. Use a shorter clip.'); return; }
    const type = S.clip.type || 'audio/webm'; const ext = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : type.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData(); form.append('audio', S.clip, 'practice.' + ext); form.append('lessonId', row.id);
    try {
      consentHint(); const result = await api('/api/speaking', form); if (token !== S.generation) return;
      response.textContent = `Transcript (check for errors):\n${result.transcript}\n\nProvisional transcript-based feedback:\n${result.feedback}`;
      message('Feedback ready. Pronunciation and real-time fluency were not assessed.');
    } catch (e) { message(e.message); }
  }), response);
}
