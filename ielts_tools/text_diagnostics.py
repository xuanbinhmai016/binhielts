"""Descriptive text statistics, not grammar checking or IELTS grading."""
import argparse
import json
import re
from collections import Counter
from pathlib import Path


def analyze_text(text, task='task2'):
    if not isinstance(text, str) or len(text) > 100000:
        raise ValueError('Provide text of at most 100,000 characters.')
    if task not in ('task1', 'task2', 'transcript'):
        raise ValueError('Unknown task.')
    # English-oriented tokenization: apostrophes and hyphens stay inside words.
    words = re.findall(r"[A-Za-z]+(?:['’\-][A-Za-z]+)*", text.lower())
    sentences = [s for s in re.split(r'[.!?]+', text) if re.search(r'[A-Za-z]', s)]
    paragraphs = [p for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    minimum = {'task1': 150, 'task2': 250, 'transcript': None}[task]
    return {'task': task, 'word_count': len(words), 'unique_word_count': len(set(words)),
            'sentence_segments': len(sentences), 'paragraph_count': len(paragraphs),
            'average_words_per_segment': round(len(words) / len(sentences), 2) if sentences else None,
            'planning_minimum_words': minimum,
            'below_planning_minimum': len(words) < minimum if minimum else None,
            'notice': 'Heuristic English token counts only. No grammar, coherence, pronunciation, band, or CEFR assessment.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('text_file', type=Path)
    parser.add_argument('--task', choices=['task1', 'task2', 'transcript'], default='task2')
    args = parser.parse_args()
    try:
        if args.text_file.stat().st_size > 500000:
            raise ValueError('Text file exceeds 500 KB.')
        print(json.dumps(analyze_text(args.text_file.read_text(encoding='utf-8'), args.task), indent=2))
    except (OSError, ValueError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
