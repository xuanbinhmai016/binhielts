# Changelog

## 2.1.1
- Include next-activity button selection, scroll/focus and visible confirmation in the standalone site.
- Add 5W1H website description and ten-commit initial-import guide.
- Provide source/configuration/docs as separate workspace files as well as the ZIP.

## 2.1.0
- Editorial welcome section with original inline study illustration.
- Four colour-coded mode cards and desktop study-journey sidebar.
- Refined lesson, resource and audio-panel styling; responsive and reduced-motion styles.
- Existing content, audio controls, backend and storage schema preserved.

## 2.0.1
- Listening audio panel placed directly below each activity title, above instructions and questions.
- Browser speech Play/Pause/Resume/Stop and playback speed; optional AI player hidden until generated.
- Stop audio when switching activities; no backend changes.

## 2.0.0
- Four clear modes, per-activity drafts and a separate unvalidated four-skill diagnostic.
- 20 original practice activities plus four diagnostic activities; official-resource navigation links.
- Configurable OpenAI backend for synthetic listening audio, speaking transcription/text feedback and a single-turn coach.
- Consent/access gate, bounded requests, pilot quotas, frontend-only Pages deployment and setup/testing guides.


## 1.1.0
- Redesigned landing page, colourful skill cards and original SVG illustration.
- Clearer local study counts, larger text/high contrast controls and mobile layout.
- Preserved all four practice activities and study backups.

## 1.0.0
- Initial four-skill mini practice site.
- Browser-based audio, local writing drafts, speaking recording and JSON backups.
- GitHub Pages deployment and manual verification guide.


## Unreleased
- Added missing `.github/workflows/pages.yml`, `.gitignore`, `backend/.env.example`, `backend/.dockerignore`.
- Removed duplicated `assets/content.js`; the site now fetches `backend/lessons.json` (single source of truth).
- Split `assets/app.js` into ES modules under `assets/js/`.
- Added split-screen layout (source left, work right) for Reading and Writing on wide screens.
- README: Python/Java tools documented as standalone offline CLI tools.
- Added 4 original vocabulary gap-fill activities (environment, education/work, technology, health) under Reading; library now 28 activities / 76 questions.
- Added Practice test mode: choose a set, do one part or the full four-part test, with timers and a results screen.
- Added accounts: backend `auth.js` (register/login/logout/delete, scrypt, bearer tokens, rate limits) and a login panel with automatic progress sync and merge.
- Practice test now lists weeks with green completion ticks (Zenlab-style).
