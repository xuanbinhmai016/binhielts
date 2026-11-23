"""Run from repository root: python -m unittest discover -s tests -v."""
import contextlib
import copy
import io
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ielts_tools.library import load_library, validate_lessons, summarize_library, find_lesson
from ielts_tools.scoring import grade_answers, normalize_answer
from ielts_tools.planning import build_plan
from ielts_tools.cli import main


class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lessons = load_library()

    def test_actual_library_is_valid(self):
        self.assertEqual(validate_lessons(self.lessons), [])

    def test_release_coverage(self):
        summary = summarize_library(self.lessons)
        self.assertEqual(summary["activities"], 24)
        self.assertEqual(summary["modes"], {"practice": 20, "diagnostic": 4})
        self.assertEqual(summary["objective_questions"], 56)

    def test_reject_non_array(self):
        self.assertTrue(validate_lessons({}))

    def test_reject_duplicate_ids(self):
        self.assertTrue(validate_lessons([self.lessons[0], self.lessons[0]]))

    def test_reject_invalid_minutes(self):
        for minutes in [True, 0, -1, "5", float("nan"), float("inf")]:
            item = copy.deepcopy(self.lessons[0])
            item["minutes"] = minutes
            self.assertTrue(validate_lessons([item]))

    def test_reject_missing_answer(self):
        item = copy.deepcopy(self.lessons[0])
        del item["questions"][0]["answer"]
        self.assertTrue(validate_lessons([item]))

    def test_normalization(self):
        self.assertEqual(normalize_answer(" NOT   GIVEN "), "not given")
        self.assertEqual(normalize_answer("short-answer"), "short answer")
        self.assertEqual(normalize_answer(None), "")

    def test_all_correct(self):
        item = find_lesson(self.lessons, "starter-listening")
        result = grade_answers(item, [" May ", "85", "12"])
        self.assertEqual((result["correct"], result["total"]), (3, 3))
        self.assertEqual(result["percent"], 100)

    def test_blank_wrong_and_exact_answers(self):
        item = find_lesson(self.lessons, "starter-listening")
        self.assertEqual(grade_answers(item, ["", "eighty-five", "12"])["correct"], 1)

    def test_reject_wrong_answer_count(self):
        with self.assertRaises(ValueError):
            grade_answers(self.lessons[0], ["May"])

    def test_no_writing_score(self):
        item = next(item for item in self.lessons if item["skill"] == "Writing")
        with self.assertRaises(ValueError):
            grade_answers(item, [])

    def test_unknown_id(self):
        with self.assertRaises(ValueError):
            find_lesson(self.lessons, "does-not-exist")

    def test_plan_rotates_and_respects_budget(self):
        plan = build_plan(self.lessons, days=8, minutes=45)
        self.assertEqual([item["skill"] for item in plan[:4]],
                         ["Listening", "Reading", "Writing", "Speaking"])
        self.assertTrue(all(item["minutes"] <= 45 for item in plan))
        self.assertNotEqual(plan[0]["lesson_id"], plan[4]["lesson_id"])

    def test_plan_reports_no_fit(self):
        plan = build_plan(self.lessons, days=4, minutes=1)
        self.assertTrue(all(item["lesson_id"] is None for item in plan))

    def test_plan_rejects_invalid_limits(self):
        with self.assertRaises(ValueError):
            build_plan(self.lessons, days=0)

    def test_cli_summary(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(["summary"]), 0)
        self.assertEqual(json.loads(output.getvalue())["activities"], 24)

    def test_cli_failure_exit_code(self):
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            result = main(["grade", "unknown", "--answer", "x"])
        self.assertEqual(result, 1)
        self.assertIn("Unknown lesson", output.getvalue())


if __name__ == "__main__":
    unittest.main()
