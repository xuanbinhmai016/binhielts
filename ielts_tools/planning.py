"""Build a bounded, rotating practice plan from actual activity durations."""
from .library import SKILLS


def build_plan(lessons, days=7, minutes=45):
    """Choose at most one activity daily, rotating skills; no synthetic lessons."""
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 365:
        raise ValueError("Days must be an integer from 1 to 365.")
    if isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 240:
        raise ValueError("Daily minutes must be an integer from 1 to 240.")
    pools = {
        skill: [item for item in lessons if item["mode"] == "practice"
                and item["skill"] == skill and item["minutes"] <= minutes]
        for skill in SKILLS
    }
    offsets = dict.fromkeys(SKILLS, 0)
    plan = []
    for day in range(days):
        skill = SKILLS[day % len(SKILLS)]
        pool = pools[skill]
        if not pool:
            plan.append({"day": day + 1, "skill": skill, "lesson_id": None,
                         "notice": "No activity fits this budget; choose a larger daily limit."})
            continue
        lesson = pool[offsets[skill] % len(pool)]
        offsets[skill] += 1
        plan.append({"day": day + 1, "skill": skill, "lesson_id": lesson["id"],
                     "title": lesson["title"], "minutes": lesson["minutes"]})
    return plan
