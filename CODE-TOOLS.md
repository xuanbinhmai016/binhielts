# Useful non-UI source code

This extension adds Python processing and Java command-line calculations; no additional interface files. Java 17+ and Python 3.9+ are recommended. These tools run locally, not on GitHub Pages. They do not call AI or send data over the network.

## New source files
- ielts_tools/analytics.py: validates version 3 browser backup sessions, computes question-weighted accuracy, per-skill attempts, unique activities and active dates. Duplicate session IDs and invalid scores are rejected. Repeated attempts are included; unique activities are not library coverage without a library denominator. Dates use the date recorded in each timestamp without timezone conversion. Does not print drafts or tokens.
- ielts_tools/text_diagnostics.py: English-oriented word counts, sentence segments, paragraphs, and task word-length checks. Apostrophes/hyphens remain inside words. Counts are heuristic; no grammar, coherence, band, CEFR or pronunciation assessment.
- tests/test_analytics.py: nine new Python test methods, including validation, privacy and boundary cases.
- java-tools/src/StudyMath.java: decimal-safe entered-band averaging and exercise accuracy, with CLI input validation and nonzero error exit codes.
- java-tools/test/StudyMathTest.java: 12 dependency-free Java checks, including quarter-band rounding and invalid inputs.

## Python commands
Run from the repository root. Keep personal backups and essays OUTSIDE the repository.
```sh
python -B -m ielts_tools.analytics /path/outside/repo/backup.json
python -B -m ielts_tools.text_diagnostics /path/outside/repo/essay.txt --task task2
python -B -m unittest discover -s tests -v
```
The analytics input must be a v3 backup with a sessions array, not a v1/v2 export. Outputs go to stdout only. Do not commit personal outputs. The newer dashboard exports v3; the older ZIP frontend does not necessarily do so. Text diagnostics and Java tools are independent of dashboard version.

## Java commands
Install JDK 17+ locally. These commands are for a shell in the repository root:
```sh
mkdir -p java-tools/build
javac -d java-tools/build java-tools/src/StudyMath.java java-tools/test/StudyMathTest.java
java -cp java-tools/build StudyMathTest
java -cp java-tools/build StudyMath band 7 7 7.5 7.5
java -cp java-tools/build StudyMath accuracy 8 10
```
On Windows create java-tools/build through File Explorer or PowerShell if mkdir -p is unavailable. Expected example results: 7.5 and 80.00%. Neither command evaluates a learner's English.

## Verification and packaging status
All 26 Python tests (17 existing plus 9 new) passed in the generation sandbox. Java source braces were checked, but there is no Java runtime/compiler here: its 12 checks have NOT been executed. No browser, backend, AI or deployment tests were run for this extension.

The existing repository ZIP gains these new source files while retaining its previous coherent frontend/backend. The partially applied v3 dashboard and FastAPI upgrade in notes/ielts_upgrade_sources.json remain unfinished and are NOT silently merged into this ZIP. This is a non-UI tools extension, not a claim that the full FastAPI upgrade is complete.

## Meaningful commits
First clone your existing repository and copy the extracted project into that clone. Add Java output ignores before compiling. Review git status so you do not stage private data.
```sh
# Add these lines to .gitignore: java-tools/build/ and *.class
git add .gitignore ielts_tools/analytics.py ielts_tools/text_diagnostics.py
git commit -m "feat(python): add private backup analytics and text diagnostics"
git add java-tools/src/StudyMath.java
git commit -m "feat(java): add decimal-safe study calculations CLI"
git add tests/test_analytics.py java-tools/test/StudyMathTest.java CODE-TOOLS.md
git commit -m "test: cover analytics and study calculations with usage guide"
git push
```
These commands are instructions; no commits or push have been made here. The ZIP contains canonical hidden filenames. Separately downloaded gitignore.txt must be renamed to .gitignore as described in the original README.
