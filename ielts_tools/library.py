"""Load and validate IELTS Studio's original lesson library. Standard library only."""
import json
from collections import Counter
from pathlib import Path

SKILLS = ("Listening", "Reading", "Writing", "Speaking")
MODES = ("practice", "diagnostic")
DEFAULT_LIBRARY = Path(__file__).resolve().parents[1] / "backend" / "lessons.json"


def validate_lessons(lessons):
    """Return all schema errors; a clean library returns an empty list."""
    if not isinstance(lessons, list) or not lessons:
        return ["Library must be a non-empty JSON array."]
    errors = []
    seen = set()
    for index, lesson in enumerate(lessons):
        label = f"Lesson {index + 1}"
        if not isinstance(lesson, dict):
            errors.append(f"{label}: must be an object.")
            continue
        for field in ("id", "title", "instructions", "content", "question_type"):
            value = lesson.get(field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{label}: {field} must be non-empty text.")
        identifier = lesson.get("id")
        if isinstance(identifier, str):
            if identifier in seen:
                errors.append(f"{label}: duplicate id {identifier!r}.")
            seen.add(identifier)
        if lesson.get("skill") not in SKILLS:
            errors.append(f"{label}: unknown skill.")
        if lesson.get("mode") not in MODES:
            errors.append(f"{label}: unknown mode.")
        minutes = lesson.get("minutes")
        if isinstance(minutes, bool) or not isinstance(minutes, (int, float)) or not (0 < minutes < float('inf')):
            errors.append(f"{label}: minutes must be finite and positive.")
        questions = lesson.get("questions")
        if not isinstance(questions, list):
            errors.append(f"{label}: questions must be an array.")
            continue
        if lesson.get("skill") in ("Listening", "Reading") and not questions:
            errors.append(f"{label}: objective activity needs questions.")
        if lesson.get("skill") in ("Writing", "Speaking") and questions:
            errors.append(f"{label}: open-response activity must not have objective answers.")
        for number, question in enumerate(questions, 1):
            if not isinstance(question, dict):
                errors.append(f"{label}, question {number}: must be an object.")
                continue
            for field in ("prompt", "answer", "explanation"):
                value = question.get(field)
                if not isinstance(value, str) or not value.strip():
                    errors.append(f"{label}, question {number}: {field} must be non-empty text.")
    return errors


def load_library(path=DEFAULT_LIBRARY):
    """Read JSON and reject invalid content before it reaches scoring tools."""
    with Path(path).open(encoding="utf-8") as source:
        lessons = json.load(source)
    errors = validate_lessons(lessons)
    if errors:
        raise ValueError("Invalid lesson library:\n" + "\n".join(errors))
    return lessons


def find_lesson(lessons, identifier):
    for lesson in lessons:
        if lesson["id"] == identifier:
            return lesson
    raise ValueError(f"Unknown lesson id: {identifier}")


def summarize_library(lessons):
    """Return counts from actual records, not hard-coded marketing statistics."""
    return {
        "activities": len(lessons),
        "modes": dict(Counter(item["mode"] for item in lessons)),
        "skills": dict(Counter(item["skill"] for item in lessons)),
        "objective_questions": sum(len(item["questions"]) for item in lessons),
        "practice_minutes": sum(item["minutes"] for item in lessons if item["mode"] == "practice"),
    }
