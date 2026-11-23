# IELTS Studio 2.0

Independent, original four-skill practice with a configurable OpenAI backend. **20 practice activities (5 per skill), a separate four-part diagnostic, and 56 objectively marked questions in total across Listening and Reading.** Writing and Speaking use prompts/self-review, not objective marking. These are mini activities, NOT full Cambridge or IELTS mock exams. No Cambridge content is reproduced.

## Simple navigation
- **Check my level:** four short starting-point activities. Listening/Reading results apply only to those questions; Writing/Speaking are self-reflections. No overall English, CEFR or IELTS band is assigned. No diagnostic is validated here.
- **Daily practice:** select a skill and activity; get explanations after submitting.
- **Test mode:** select a timed mini activity. The timer starts when it opens; switching/restarting starts a new attempt. Objective answers lock and review on submission/time expiry. For open responses, time expiry prompts you to save/log; it does not score them. Not a secure or full-length examination.
- **AI coach:** single-turn questions for Listening/Speaking. Speaking activities support microphone/upload transcription and text-based feedback. Listening activities can generate synthetic audio from the original fixed passage. No live voice conversation, automatic pronunciation assessment or official bands.

## Files
```
index.html
assets/styles.css       colourful mobile-friendly design
assets/content.js      all original activities and answer keys
assets/config.js       public backend URL (NEVER an API key)
assets/app.js           frontend modes, recordings, backups and AI requests
backend/server.js       Express/OpenAI API
backend/lessons.json    matching server-side activity library
backend/package.json
backend/.env.example    configuration template, no secrets
backend/Dockerfile
backend/.dockerignore
.github/workflows/pages.yml
README.md
SETUP-AI.md
TESTING.md
CHANGELOG.md
LICENSE
.gitignore
```

## Run practice without AI
Extract the ZIP. From the repository root run `python -m http.server 8000` (or `python3 ...`) and visit http://localhost:8000. Basic activities work without a backend. Microphone access requires localhost or HTTPS and browser support. A camera is not used. Backups omit audio, AI replies and secrets. Drafts are stored per activity. Version 1 study data is migrated when possible; export your old data first. A manual reset also removes old study data. Display preferences are separate.

## Upload frontend to GitHub
1. Create a repository, e.g. `ielts-study`, and extract the ZIP. Upload the extracted files to its root, preserving `assets`, `backend` and `.github` folders. Do not upload only the ZIP or add another enclosing folder.
2. Do NOT upload a real `.env`, recordings, backups or credentials. `.env.example` contains placeholders only. Review uploads before committing: the browser uploader does not enforce `.gitignore` for you.
3. If hidden files are missed, use Add file → Create new file, enter `.github/workflows/pages.yml`, and copy its contents. The included workflow stages ONLY `index.html` and `assets` for Pages, excluding backend files.
4. Settings → Pages → Source → GitHub Actions. Actions must be enabled. Run the Deploy IELTS Studio frontend workflow or commit to main.
5. Your site is normally https://YOUR-USERNAME.github.io/ielts-study/. Set the API URL only after separately deploying the backend.
6. For updates, replace files at the same paths and commit. Keep the existing repository history; no force push is needed.

### Git upload alternative
Create an empty remote repository first. From the extracted folder:
```sh
git init
git add .
git commit -m "IELTS Studio 2.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ielts-study.git
git push -u origin main
```
For an existing repository, clone it and copy updates in, then commit/push. Use a credential manager or SSH; do not share tokens in chat. If you use Pages branch publishing instead of Actions, static backend source files may also be served: never place any secrets anywhere in the repository. Actions staging is recommended.

## AI setup
Read **SETUP-AI.md**. GitHub Pages cannot run the backend. You need Node 20+ hosting, an OpenAI account with access to the configured models, and paid usage where required. The default models are configurable: gpt-4o-mini, whisper-1, tts-1. No service was connected and no API call was tested during generation.

## Official resources
The app includes navigation links (not embedded/downloaded content) to:
- Cambridge preparation: https://www.cambridgeenglish.org/exams-and-tests/ielts/preparation/
- IELTS resources: https://ielts.org/take-a-test/preparation-resources
- British Council practice: https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests
These external pages/availability were not live-verified in this environment. Check current publisher editions and access terms. Cambridge books, passages, answer keys and recordings are not included.

## Limitations and public launch
Generated starter code has not been browser-tested or live-API-tested here. Follow TESTING.md. Answer keys are public client code. Exact answers are case/whitespace/hyphen normalised; valid alternative phrasings are not generally accepted. Short-answer number questions expect digits. The timer uses wall-clock time but background browser scheduling can delay display/expiry handling. Audio voices/recording formats vary by browser. Progress counts attempts. Storage can fail or be cleared; export backups.

AI replies are provisional. Transcription can mishear words; feedback based on text cannot establish pronunciation, accent or acoustic fluency. There is no chat memory. Text/audio is sent only on explicit AI request with consent selected. The backend processes uploads in memory and does not deliberately save content, but this is not a guarantee of immediate memory erasure; provider/host data handling must be checked. Never claim zero provider retention without configuring and verifying it.

The backend is a **small trusted-pilot scaffold**, not a production multi-user service. Shared code protection, exact CORS origins, in-memory per-IP rate limits, per-process daily provider-call caps, bounded upload/output sizes and timeouts are included. These do not replace individual accounts, persistent quotas, proxy security, abuse monitoring, child-privacy safeguards or billing controls. Quotas reset on restart and are not coordinated across replicas. Do not expose this pilot publicly without further hardening and a privacy policy. No passwords/API keys are in the ZIP.

## Improve with me
Send the current relevant files or ZIP, desired change, browser/device and error messages. Do not send private keys, private backups or sensitive recordings. I can prepare updates when you return, but cannot automatically monitor, host or push daily changes without an authorised integration.

## Listening audio (2.0.1)
At the top of each listening activity, press **Play listening audio**. This uses browser speech synthesis without your AI backend; check your volume and browser speech support. Pause/Resume control browser speech; Stop cancels playback. Speed changes take effect on the next Play. Optional AI audio is inside a collapsed section; after generation succeeds, use its native audio player for playback and seeking. The two sources use the same original passage. No pre-recorded MP3s or Cambridge tracks are included. Update assets/app.js and assets/styles.css together; then refresh your deployed site.

## Visual refresh (2.1.0)
New welcome artwork, colour-coded mode cards, study sidebar on larger screens, and streamlined lesson panels. Listening controls remain directly below the activity title. On smaller screens the study sidebar moves below the practice area. No external fonts/images, fake learner statistics or new assignment content were added. Upload index.html, assets/styles.css and assets/app.js together. Display controls remain available. Browser and accessibility testing are still required.

## Separate source files, 5W1H and commits
This repository contains 20 source/configuration/documentation files, not a one-file website. WEBSITE-DESCRIPTION.md explains What, Why, Who, Where, When and How. COMMIT-GUIDE.md provides ten meaningful initial-import commits and safe push instructions; no commits or push have already occurred. The latest Find my next activity fix is now included in assets/app.js and index.html, matching the preview behaviour.

## If you download individual workspace files
The workspace cannot create dot-prefixed paths, so the separately downloadable source folder uses four visible names. Before running Git commands, rename:
- gitignore.txt → .gitignore
- backend/env.example.txt → backend/.env.example
- backend/dockerignore.txt → backend/.dockerignore
- github/ → .github/ (keep workflows/pages.yml inside it)

The ZIP already contains the correct dot-prefixed names. These renames apply **only to separate downloads**. Do not add a private backend/.env or provider key to Git.
