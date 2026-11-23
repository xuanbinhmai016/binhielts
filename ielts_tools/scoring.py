"""Exact-answer scoring for short original activities; never assigns IELTS bands."""
import re


def normalize_answer(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip().lower()).replace("-", " ")


def grade_answers(lesson, answers):
    """Mark one validated Reading/Listening activity using ordered answers."""
    if lesson.get("skill") not in ("Reading", "Listening"):
        raise ValueError("Writing and Speaking require reflection, not objective scoring.")
    questions = lesson.get("questions", [])
    if not questions:
        raise ValueError("This activity has no objective questions.")
    if not isinstance(answers, (list, tuple)) or len(answers) != len(questions):
        raise ValueError(f"Provide exactly {len(questions)} ordered answers.")
    details = []
    for index, (question, answer) in enumerate(zip(questions, answers), 1):
        details.append({
            "number": index,
            "prompt": question["prompt"],
            "submitted": answer,
            "expected": question["answer"],
            "correct": normalize_answer(answer) == normalize_answer(question["answer"]),
            "explanation": question["explanation"],
        })
    correct = sum(item["correct"] for item in details)
    return {
        "lesson_id": lesson["id"],
        "correct": correct,
        "total": len(questions),
        "percent": round(correct / len(questions) * 100, 2),
        "notice": "Exercise accuracy only. Not an IELTS band, CEFR level or validated diagnostic.",
        "details": details,
    }
