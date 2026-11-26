# Publish a multi-file repository with meaningful commits

This guide creates **real commits when you run it**. No GitHub push or commit has already been performed by the assistant. Do not fabricate dates, contributors, test results or daily activity.

## Prepare
1. Install Git and create a new **empty** GitHub repository (for example `ielts-study`). Do not initialise that remote with a README for these commands.
2. Download the expanded source files or extract the ZIP. Keep index.html, assets/, backend/, .github/ and all documentation together at the project root.
3. Open a terminal in that project folder. Use your own Git identity and GitHub browser authentication, SSH or credential manager. Never put a token in these files or share it in chat.
4. These commands assume a new, uncommitted local project and an empty remote. If you already have a repository, clone it and commit only actual new changes; do not rewrite existing history or force-push to imitate this sequence.

```sh
git init
git branch -M main
# If Git asks for an identity, use YOUR real details:
# git config user.name "Your Name"
# git config user.email "Your email or GitHub noreply email"
```


## If you download individual workspace files
The workspace cannot create dot-prefixed paths, so the separately downloadable source folder uses four visible names. Before running Git commands, rename:
- gitignore.txt → .gitignore
- backend/env.example.txt → backend/.env.example
- backend/dockerignore.txt → backend/.dockerignore
- github/ → .github/ (keep workflows/pages.yml inside it)

The ZIP already contains the correct dot-prefixed names. These renames apply **only to separate downloads**. Do not add a private backend/.env or provider key to Git.

## Ten logical commits
The first few commits intentionally show incremental assembly; the site is not complete until its frontend code and content are all committed. These are suggested groups for the initial import, not a claim that the project was developed over ten days.

### 1. Repository foundation and licence
```sh
git add .gitignore LICENSE README.md
git commit -m "docs: initialise IELTS Studio repository and licence"
```

### 2. Responsive page layout and visual design
```sh
git add index.html assets/styles.css
git commit -m "feat(ui): add colourful responsive learning dashboard"
```

### 3. Study interaction and public configuration
```sh
git add assets/app.js assets/config.js
git commit -m "feat(practice): add activity navigation audio and study tools"
```

### 4. Original four-skill exercise library
```sh
git add assets/js
git commit -m "feat(content): add original four-skill practice and diagnostic activities"
```

### 5. Optional AI backend
```sh
git add backend/package.json backend/server.js backend/lessons.json
git commit -m "feat(api): add optional coach speech and transcription backend"
```

### 6. Backend environment template and container setup
```sh
git add backend/.env.example backend/Dockerfile backend/.dockerignore
git commit -m "chore(backend): add environment template and container configuration"
```

### 7. GitHub Pages deployment
```sh
git add .github/workflows/pages.yml
git commit -m "ci: add frontend-only GitHub Pages deployment"
```

### 8. Manual verification guide
```sh
git add TESTING.md
git commit -m "docs(testing): add browser audio and practice verification checklist"
```

### 9. AI hosting and consent instructions
```sh
git add SETUP-AI.md
git commit -m "docs(ai): explain private backend setup and consent requirements"
```

### 10. Website description and maintenance guidance
```sh
git add WEBSITE-DESCRIPTION.md COMMIT-GUIDE.md CHANGELOG.md
git commit -m "docs: add 5W1H description commit guide and release notes"
```

## Review and push all commits
Confirm every intended source file is tracked, and no private files are staged:
```sh
git status
git ls-files
git log --oneline --max-count=10
```
Perform TESTING.md checks and the available syntax checks before public use. If you change files during verification, make a truthful additional fix commit with a description of what changed.

Use the repository URL from GitHub, replacing placeholders below:
```sh
git remote add origin https://github.com/YOUR-USERNAME/ielts-study.git
git push -u origin main
```
One push can send all ten commits and all tracked files. It does **not** mean only one file is uploaded. If authentication or a non-empty remote prevents the push, resolve it normally; do not force-push over someone else's work.

## Make the frontend live
The included workflow deploys only frontend assets. In Settings → Pages select **GitHub Actions**, enable Actions if needed, and run the Deploy workflow if it has not started. Follow the workflow's deployment URL after it succeeds. Never deploy the whole repository directory as static content: private backend files must not be published.

## Later improvements
Use small commits for real changes such as adding a lesson, fixing a button, improving audio error handling or documenting deployment. A normal later update looks like:
```sh
git checkout -b improve-listening
# edit and test the relevant files
git add assets/app.js TESTING.md
git commit -m "fix(listening): explain a specific playback failure"
git push -u origin improve-listening
```
Open a pull request and merge when ready. Do not manufacture commits merely to make a contribution graph look busy.

## Secrets
Upload backend/.env.example, **not** backend/.env. The real OPENAI_API_KEY belongs only in backend environment settings. assets/config.js contains a public backend URL, never a provider key. Review what Git will publish before pushing. Browser backup and recording files are personal data, not source code.

## Python extension: three meaningful additional commits
For the extended 26-file repository, the original ten groups above do not yet include the new Python files. After those groups, or in your existing clone, run:
```sh
python -B -m unittest discover -s tests -v
git add ielts_tools/library.py ielts_tools/scoring.py
git commit -m "feat(python): add lesson validation and objective exercise scoring"
git add ielts_tools/planning.py ielts_tools/cli.py
git commit -m "feat(python): add four-skill planner and terminal commands"
git add tests/test_tools.py PYTHON-TOOLS.md README.md COMMIT-GUIDE.md
git commit -m "test(python): add exercise tools tests and usage documentation"
git status
git push
```
Run from the extracted project root. These commands only create commits when you execute them. If README.md and COMMIT-GUIDE.md were already staged in the initial ten groups, the final group still commits the new tests and Python guide. Do not stage __pycache__, *.pyc or personal command output. The CLI is local tooling, not a Python backend running on GitHub Pages.
