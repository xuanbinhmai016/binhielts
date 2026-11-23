# Python source-code tools

These are working offline exercise-management tools, not extra website interface files. They use the existing backend/lessons.json and Python 3.9+ standard library. No pip installation, keys, network or separate server is needed. Run commands from the extracted repository root. On some systems use python3 instead of python.

## Source files
- ielts_tools/library.py — lesson loading, schema checks, duplicate-ID detection and counts.
- ielts_tools/scoring.py — exact-answer Listening/Reading grading with explanations.
- ielts_tools/planning.py — rotate four skills using real activities within a daily time budget.
- ielts_tools/cli.py — terminal commands and error exit codes.
- tests/test_tools.py — 17 automated unit/integration tests.

ielts_tools is a Python namespace package; no __init__.py or third-party package installation is required. The workspace may warn that its outer ielts-study folder is not an importable Python identifier; this is not a runtime problem when running the commands from that folder.

## Commands
```sh
python -m ielts_tools.cli validate
python -m ielts_tools.cli summary
python -m ielts_tools.cli plan --days 7 --minutes 45
python -m ielts_tools.cli grade starter-listening --answer May --answer 85 --answer 12
python -m unittest discover -s tests -v
```

Use a custom library:
```sh
python -m ielts_tools.cli --library backend/lessons.json validate
```

JSON results are printed to the terminal; nothing is saved automatically. If desired, redirect a non-personal plan locally with `python -m ielts_tools.cli plan > study-plan.json`. Do not commit private answers, personal plans or study records. Command-line answers may remain in shell history.

## Limits
- This CLI does not connect to the browser, replace the Express AI backend or introduce learner accounts.
- GitHub Pages cannot execute Python. Run these tools locally or in your own test environment.
- Grading uses case, whitespace and ASCII-hyphen normalization, matching the website's simple approach. It does not understand equivalent wording or spelled-out numbers. A result is exercise accuracy, never an IELTS band or CEFR level.
- Writing and Speaking are deliberately not objectively scored.
- Plans select one activity per day and repeat after exhausting each skill's eligible pool. A skill with no activity within the budget is explicitly flagged. This is a schedule, not a validated personalised learning recommendation.
- The coverage regression test pins this release to 24 activities and 56 questions. When intentionally changing content, review and update those expectations.

## Verification
All 17 tests passed in the generation sandbox against the bundled lesson library. Validate, summary and example grade commands were also checked. This does not establish browser, JavaScript backend, live-AI or deployment success.

## Add to an existing GitHub repository
Copy ielts_tools/, tests/, PYTHON-TOOLS.md, README.md and COMMIT-GUIDE.md into your existing clone. Keep the source folders, not the ZIP itself.
```sh
python -m unittest discover -s tests -v
git add ielts_tools tests PYTHON-TOOLS.md README.md COMMIT-GUIDE.md
git commit -m "feat(python): add lesson validation scoring planner and tests"
git push
```
Add `__pycache__/` and `*.pyc` to your local .gitignore before staging if you run Python without `-B`. For smaller truthful commits, see COMMIT-GUIDE.md. No GitHub commits or pushes have been performed here.
