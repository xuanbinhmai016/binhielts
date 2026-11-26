// Shared constants and the single mutable session object used by all modules.
export const skills = ['Listening', 'Reading', 'Writing', 'Speaking'];
export const KEY = 'ielts-studio-v2';
export const modes = [
  { id: 'diagnostic', title: 'Check my level', note: 'Four short starting-point activities' },
  { id: 'practice', title: 'Daily practice', note: 'Choose a skill and get explanations' },
  { id: 'mock', title: 'Practice test', note: 'Do one part, or a full test with all four' },
  { id: 'test', title: 'Test mode', note: 'Timed mini tests with a final review' },
  { id: 'coach', title: 'AI coach', note: 'Ask questions and practise with AI' },
];
export const S = {
  state: null, library: [], diagnostic: [],
  mode: 'practice', skill: 'Listening', selected: 'starter-listening', diagnosticIndex: 0,
  timer: null, deadline: null, seconds: 0,
  recorder: null, stream: null, clip: null, clipUrl: null, aiAudioUrl: null,
  generation: 0, pendingRecording: false, requestBusy: false,
  mock: null, authToken: null, onChange: null, onSave: null,
};
// True while a countdown-style attempt is running (Test mode, or a Practice test part).
export const timed = () => S.mode === 'test' || (S.mode === 'mock' && !!S.mock?.active);
