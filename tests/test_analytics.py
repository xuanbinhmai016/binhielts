import unittest
from ielts_tools.analytics import summarize_backup
from ielts_tools.text_diagnostics import analyze_text


def session(identifier='a', skill='Reading', correct=2, total=3):
    return dict(id=identifier, lesson_id='original-reading', skill=skill,
                date='2026-01-01T12:00:00Z', correct=correct, total=total)


class AnalyticsTests(unittest.TestCase):
    def test_weighted_accuracy(self):
        result = summarize_backup(dict(version=3, sessions=[session(), session('b', correct=1, total=1)]))
        self.assertEqual(result['objective_accuracy_percent'], 75)
        self.assertEqual(result['unique_activities'], 1)
        self.assertEqual(result['active_dates'], 1)

    def test_empty(self):
        self.assertIsNone(summarize_backup(dict(version=3, sessions=[]))['objective_accuracy_percent'])

    def test_open_response(self):
        result = summarize_backup(dict(version=3, sessions=[session(skill='Writing', correct=None, total=None)]))
        self.assertEqual(result['skills']['Writing']['attempts'], 1)
        self.assertIsNone(result['skills']['Writing']['accuracy_percent'])

    def test_reject_invalid(self):
        cases = [dict(version=2, sessions=[]), dict(version=3, sessions=None),
                 dict(version=3, sessions=[session(), session()])]
        for changes in [dict(total=0), dict(correct=True), dict(correct=4), dict(date='bad'),
                        dict(skill='Other'), dict(skill='Speaking'), dict(id='')]:
            item = session(); item.update(changes)
            cases.append(dict(version=3, sessions=[item]))
        for case in cases:
            with self.subTest(case=case), self.assertRaises(ValueError):
                summarize_backup(case)

    def test_privacy(self):
        backup = dict(version=3, sessions=[], drafts={'essay': 'private words'}, token='secret')
        result = str(summarize_backup(backup))
        self.assertNotIn('private words', result)
        self.assertNotIn('secret', result)


class TextTests(unittest.TestCase):
    def test_count(self):
        result = analyze_text("It's a long-term plan.\n\nPractice helps!", 'task1')
        self.assertEqual(result['word_count'], 6)
        self.assertEqual(result['paragraph_count'], 2)
        self.assertEqual(result['sentence_segments'], 2)
        self.assertTrue(result['below_planning_minimum'])

    def test_empty(self):
        result = analyze_text('')
        self.assertEqual(result['word_count'], 0)
        self.assertEqual(result['paragraph_count'], 0)
        self.assertIsNone(result['average_words_per_segment'])

    def test_minimum(self):
        self.assertFalse(analyze_text('word ' * 250)['below_planning_minimum'])
        self.assertIsNone(analyze_text('hello', 'transcript')['below_planning_minimum'])

    def test_invalid(self):
        for text, task in [(None, 'task1'), ('a' * 100001, 'task2'), ('hello', 'bad')]:
            with self.assertRaises(ValueError):
                analyze_text(text, task)


if __name__ == '__main__':
    unittest.main()
