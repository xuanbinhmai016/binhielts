"""Terminal entry point: validate, summarize, or score original activities."""
import argparse
import json
import sys
from .library import DEFAULT_LIBRARY, find_lesson, load_library, summarize_library
from .scoring import grade_answers
from .planning import build_plan


def build_parser():
    parser = argparse.ArgumentParser(description="IELTS Studio offline exercise tools")
    parser.add_argument("--library", default=str(DEFAULT_LIBRARY), help="Lesson JSON path")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("validate", help="Check lesson structure and unique identifiers")
    commands.add_parser("summary", help="Print activity and question counts as JSON")
    plan = commands.add_parser("plan", help="Rotate four skills within a daily time budget")
    plan.add_argument("--days", type=int, default=7)
    plan.add_argument("--minutes", type=int, default=45)
    grade = commands.add_parser("grade", help="Score a Listening or Reading exercise")
    grade.add_argument("lesson_id")
    grade.add_argument("--answer", action="append", required=True, help="Repeat in question order")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        lessons = load_library(args.library)
        if args.command == "validate":
            print(f"Valid library: {len(lessons)} activities.")
        elif args.command == "summary":
            print(json.dumps(summarize_library(lessons), indent=2))
        elif args.command == "plan":
            print(json.dumps(build_plan(lessons, args.days, args.minutes), indent=2))
        else:
            result = grade_answers(find_lesson(lessons, args.lesson_id), args.answer)
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
