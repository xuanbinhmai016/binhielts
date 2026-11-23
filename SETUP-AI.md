# OpenAI backend setup — owner only

The website frontend stays on GitHub Pages. The Node backend must run elsewhere. This package supplies integration code; it is NOT already connected. Review the current OpenAI API documentation and verify your account's model access before deploying.

## Local pilot
1. Install Node.js 20+ (22 recommended). In `backend`, run `npm install`. Review dependency advisories (`npm audit`) and commit the generated package-lock.json after checking; this package does not include a tested lockfile.
2. Copy `.env.example` to `.env`. Never commit `.env`. Set `OPENAI_API_KEY` privately from your provider account. Do not enter it in the website, frontend config, GitHub repo or chat.
3. Generate a random access code with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set it as STUDY_ACCESS_CODE. This code gates the pilot backend; it is NOT an OpenAI key. Share it only with trusted authorised users, out of band. Anyone knowing it can consume your allowance.
4. Set ALLOWED_ORIGINS to exact frontend origins, e.g. `http://localhost:8000,https://YOUR-USERNAME.github.io`. Do not include `/ielts-study`, trailing slashes, wildcard origins or localhost in production if not needed.
5. Keep TRUST_PROXY_HOPS=0 for direct localhost. On a hosted service, verify exactly which reverse proxies are trusted before setting a count. An incorrect setting can permit IP spoofing or break limits; do not simply use `true`.
6. `npm run check`, then `npm start`. Open http://localhost:3000/health to check process readiness (this does not test OpenAI).
7. In `assets/config.js`, set API_BASE_URL to `http://localhost:3000`. Run the frontend server from the project root: `python -m http.server 8000`. Open http://localhost:8000.
8. In the website, enter the backend access code and read/select consent. Generate audio for a listening activity; record a short speaking answer then request feedback. Expect usage charges. If a request fails, check model access, key/billing, endpoint URL, origin and proxy settings. Never publish provider error bodies or keys to learners.

## Hosted pilot
Use a Node-capable hosting service or your own server; GitHub Pages is frontend-only. For a repository-connected Node service, set Root Directory `backend`, build command `npm install --omit=dev`, start command `npm start`. Alternatively build the included Dockerfile from the backend folder. Supply environment variables through the hosting service's secret/environment settings, not through a file in GitHub.

Required: OPENAI_API_KEY, STUDY_ACCESS_CODE, ALLOWED_ORIGINS. Optional: models, MAX_DAILY_PROVIDER_CALLS (default 40) and verified TRUST_PROXY_HOPS. Use the host-assigned PORT. HTTPS is required for the hosted API. Set API_BASE_URL in assets/config.js to the hosted base URL, commit and redeploy Pages. A GitHub Pages site's origin is `https://YOUR-USERNAME.github.io`, regardless of repository path.

## Provider endpoints and defaults
- `/v1/audio/transcriptions`: whisper-1, English transcription, maximum app upload 10 MB.
- `/v1/audio/speech`: tts-1, alloy synthetic voice, MP3 output from a fixed original passage.
- `/v1/chat/completions`: gpt-4o-mini, bounded output and supportive instructions.
Model availability, pricing and supported formats can change. Configuration fields allow updates, but choosing a model using a different API schema requires code changes too. See https://platform.openai.com/docs/guides/speech-to-text, https://platform.openai.com/docs/guides/text-to-speech and https://platform.openai.com/docs/api-reference/chat . Links are reference guidance, not evidence of live testing.

## Limits, costs and security
All AI routes require an allowed browser origin and access code. CORS is not authentication: non-browser callers can forge Origin, so the code and real account/usage controls matter. Rate limiting happens before authentication to slow brute-force attempts. The pilot cap is per process, 40 provider calls per UTC day by default; speaking reserves 2 calls (transcription + feedback), and failed calls count. It resets on restart and multiplies with replicas. This is NOT a reliable spending limit. Set provider budget alerts/controls where available and monitor your billing.

Uploads are bounded but MIME labels are not proof of file contents; the provider must also accept the format. Before public release, add authenticated individual users, durable per-user/global quotas, concurrency protection, content/file validation, monitoring without sensitive logs, an approved age/consent policy and incident handling. Review current provider retention and training policies and host logs. The app itself does not intentionally persist recordings on the backend. It makes no claim about third-party zero retention.

## Privacy and assessment
Learners opt in before selected text/audio is sent. Synthetic audio is clearly labelled. Transcripts are shown for correction/review; feedback may reflect transcription errors. The supplied speaking feedback reviews only transcript relevance/vocabulary/grammar, not pronunciation or acoustic fluency. Do not advertise it as official IELTS assessment. If pronunciation assessment or real-time voice tutoring is added later, choose an appropriate audio-capable method and validate it separately.
