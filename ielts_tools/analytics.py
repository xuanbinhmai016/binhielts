"""Offline analysis of v3 browser backups. No uploads, bands, or draft output."""
import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

SKILLS = ('Listening', 'Reading', 'Writing', 'Speaking')


def summarize_backup(backup):
    if not isinstance(backup, dict) or backup.get('version') != 3:
        raise ValueError('Expected a version 3 browser backup.')
    sessions = backup.get('sessions')
    if not isinstance(sessions, list):
        raise ValueError('sessions must be an array.')
    seen, activities, dates = set(), set(), set()
    totals = {skill: {'attempts': 0, 'correct': 0, 'questions': 0} for skill in SKILLS}
    for session in sessions:
        if not isinstance(session, dict):
            raise ValueError('Each session must be an object.')
        for key in ('id', 'lesson_id', 'date'):
            if not isinstance(session.get(key), str) or not session[key].strip():
                raise ValueError(f'Session requires text {key}.')
        if session['id'] in seen:
            raise ValueError('Duplicate session id.')
        seen.add(session['id'])
        skill = session.get('skill')
        if skill not in SKILLS:
            raise ValueError('Unknown skill.')
        try:
            timestamp = datetime.fromisoformat(session['date'].replace('Z', '+00:00'))
        except ValueError as error:
            raise ValueError('Invalid ISO session date.') from error
        dates.add(timestamp.date().isoformat())
        correct, total = session.get('correct'), session.get('total')
        if skill in ('Writing', 'Speaking'):
            if correct is not None or total is not None:
                raise ValueError('Open responses cannot have objective scores.')
        elif (isinstance(correct, bool) or isinstance(total, bool)
              or not isinstance(correct, int) or not isinstance(total, int)
              or total <= 0 or not 0 <= correct <= total):
            raise ValueError('Objective scores require integers: 0 <= correct <= total, total > 0.')
        bucket = totals[skill]
        bucket['attempts'] += 1
        if total is not None:
            bucket['correct'] += correct
            bucket['questions'] += total
        activities.add(session['lesson_id'])
    for bucket in totals.values():
        bucket['accuracy_percent'] = (round(100 * bucket['correct'] / bucket['questions'], 2)
                                      if bucket['questions'] else None)
    questions = sum(b['questions'] for b in totals.values())
    correct = sum(b['correct'] for b in totals.values())
    return {'attempts': len(sessions), 'unique_activities': len(activities),
            'active_dates': len(dates), 'date_basis': 'Date as recorded in each timestamp; no timezone conversion.',
            'objective_accuracy_percent': round(100 * correct / questions, 2) if questions else None,
            'skills': totals, 'notice': 'Repeated attempts included. Accuracy is not an IELTS band. Drafts excluded.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backup', type=Path)
    args = parser.parse_args()
    try:
        if args.backup.stat().st_size > 5_000_000:
            raise ValueError('Backup exceeds the 5 MB input limit.')
        result = summarize_backup(json.loads(args.backup.read_text(encoding='utf-8')))
        print(json.dumps(result, indent=2))
    except (OSError, ValueError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
