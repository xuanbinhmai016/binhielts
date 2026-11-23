# IELTS Studio — website description (5W1H)

## Short description
IELTS Studio is an independent four-skill English practice website with a colourful, responsive interface. Learners can explore original listening, reading, writing and speaking activities, review answers, keep local drafts, record speaking practice and optionally use an owner-hosted AI coach.

**Suggested GitHub repository description:**
> A colourful four-skill IELTS practice website with original exercises, listening audio, study progress, speaking recording and an optional AI backend.

## What?
A multi-file website built with HTML, CSS and JavaScript, plus an optional Node.js/Express backend. It contains 20 original daily-practice activities (five per skill) and four separate introductory diagnostic activities. Modes include a starting-point check, daily practice, timed mini tests and an AI coach. Listening controls appear above the questions. Writing includes Academic Task 1/2 and General Training letter practice.

This is a starter practice library—not a full IELTS course, a complete examination simulator or an official scoring service. The exercises are original, not copied Cambridge questions.

## Why?
To make regular English practice easier to start and easier to repeat. A clear layout, colour-coded choices, explanations and accessible display controls help learners find a manageable next step. The project is also designed to be maintained in GitHub through small, understandable updates.

These are design goals, not evidence of improved IELTS scores or guaranteed accessibility.

## Who?
Learners preparing for IELTS, independent English learners, and tutors who want a small practice resource to adapt. The interface aims to welcome different ages and experience levels. Young learners should use recording and online AI features with appropriate adult guidance.

The repository owner maintains the site and decides whether to enable the optional backend. No account system or production multi-user authentication is included.

## Where?
The static frontend can run locally or on GitHub Pages. All project source files belong in one GitHub repository with their folder structure preserved. The Node backend must run on a separate backend-capable host; GitHub Pages does not run it.

Without AI, drafts and study progress stay in the learner's browser. Recordings remain on the device unless the learner explicitly sends them to the configured transcription service. Export backups before changing devices or clearing browser data.

## When?
Use the site whenever a short practice session fits your day. A suggested starting routine is 15 minutes on one skill, followed by review; this is a suggestion, not a programme proven to raise test scores. Mini-test time limits and task guidance are shown in each activity.

Publish after local checks, then review the live deployment. Improve the repository through meaningful commits when a real change is ready. No automated daily maintenance, scheduled lesson release or fabricated historical commits are supplied.

## How?
1. Open a study mode and choose a skill/activity.
2. For Listening, press **Play listening audio**. Browser speech needs a supported browser, not an AI key. Optional AI-generated audio needs a configured backend.
3. Submit Listening/Reading answers and review the explanations. Short results cannot be converted to IELTS bands.
4. Write a response with a timer and word count, or record Speaking practice and self-review it.
5. Keep local drafts and study logs; export/import a backup when needed.
6. Optionally deploy the backend, keep the provider key private, configure the public API URL, and require consent before transmitting text/audio.
7. Maintain the source through the staged commands in COMMIT-GUIDE.md.

## Important limits
- Diagnostic results are unvalidated; Writing/Speaking use self-reflection rather than official assessment.
- Speech is synthetic, not a recorded Cambridge track. Voice availability depends on the browser.
- Speaking feedback from a transcript does not assess pronunciation or acoustic fluency.
- AI can make mistakes and may incur provider/hosting costs. Its setup has not been live-tested here.
- Browser, accessibility, deployment and recording testing are still required; see TESTING.md.
- The backend's shared access code and in-memory limits are a trusted-pilot scaffold, not production account security or a reliable spending cap.

Independent project. Not affiliated with IELTS, British Council, IDP or Cambridge. Respect copyright when adding material.
