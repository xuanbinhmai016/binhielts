# Verification checklist

No browser, Node runtime or live OpenAI connection was available during generation. Local/package checks do not establish production readiness. Run these checks before sharing with learners.

## Syntax and setup
- Node 20+: `node --check` on every file in `assets/js/` plus `assets/config.js`, and `node --check backend/server.js`.
- `cd backend && npm install && npm run check`; review npm audit and test dependencies. GitHub Actions also checks syntax before Pages deployment.
- Backend must refuse startup without key, strong access code or exact allowed origins.
- Health route must work without exposing configuration/secrets; health is not a provider test.

## Navigation and local data
- Test all four modes, four skill buttons and every activity selector on desktop/mobile/keyboard. Large text, high contrast, zoom and reduced motion must remain usable.
- Check 20 practice activities and four diagnostic steps. Complete the diagnostic: objective profiles plus separate self-reflections, no official band/CEFR claim.
- Test mode auto-starts. Objective answers lock at expiry/submission. Practice can restart. Open responses request manual save at expiry.
- Listening hides transcript during diagnostic/test until marking. Browser voice failures show a message.
- Check Writing draft persistence per activity and v1 draft/progress migration. Back up before replacing the app.
- Export, reset, reload, import v2 backup; also test v1 import, malformed JSON and oversized files. AI codes/audio/replies must not appear in backups.
- Speaking: permit/deny microphone, start/stop/play/download, switch activity while recording and while permissions are pending. Ensure microphone stops. Try supported uploads and files above 10 MB. Downloads are lost on activity switch unless saved.

## Objective answer tests
Use the answer keys in backend/lessons.json for development. Each Listening/Reading library exercise returns its expected score with the supplied answers. Check incorrect/blank answers and case/whitespace/hyphen normalisation. No alias support beyond this is promised. Reading uses only the passage. Correct each explanation if it is ambiguous.

## AI with a privately configured key
- Blank/invalid API URL: offline message; regular practice still works.
- Missing consent: no network request. Missing/wrong access code: rejection. Do not log secrets.
- Allowed exact origin succeeds; disallowed origin and missing origin fail. Preflight succeeds for allowed origin. Protect routes with authentication, not CORS alone.
- Transcribe a short clear answer and compare transcript with what was said. Feedback must not claim pronunciation or official band scoring.
- Synthetic listening speech corresponds to the original passage and plays in the frontend.
- Ask coach a simple question and verify safe plain-text rendering. Network/provider errors and timeout do not freeze the page.
- Test 8 requests/minute rate limit and a very small daily provider-call cap. Confirm speaking uses two reservations. Document restart/replica limitations.
- Validate supported browser audio formats with the selected transcription model; invalid file MIME labels are not trusted evidence of real audio.
- Confirm provider/host privacy, retention, billing and age/consent policy before a public launch.

## Deployment
Confirm Pages publishes frontend only, no real .env or access codes exist in Git history, backend secrets are in host environment settings, and mobile HTTPS microphone/CORS behavior works. If a secret is accidentally published, revoke/rotate it immediately; deletion from the current file does not erase Git history.

### Audio-first listening checks
- In diagnostic, practice and test modes, confirm the audio panel is directly below the listening title and before the questions.
- Play browser audio without an AI configuration; pause, resume, stop, and replay at another speed. Check blocked/unsupported speech handling.
- Switch activity/mode while audio plays and confirm it stops.
- Confirm the AI player is hidden until generation succeeds and that playing AI audio cancels browser speech. AI calls require separately configured consent and backend access.

### Next-activity button
Click Find my next activity from each mode. Confirm it opens daily practice, selects the first/next activity for the current skill, scrolls/focuses the practice area, displays its title, and wraps after the last activity. Verify drafts are retained. Actual browser scrolling must be tested on the deployed site.

## Accounts
Start the backend locally (see SETUP-AI.md, `ALLOWED_ORIGINS=http://localhost:8000`, `PORT=3055`) and run `node tests/auth-smoke.mjs` from the project root. It registers test users, checks login/logout, progress sync, isolation between users, CORS/origin rules, rate limiting and account deletion. Use a throwaway `DATA_FILE`.
