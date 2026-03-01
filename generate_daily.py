#!/usr/bin/env python3
"""Generate today's daily element and write to data/daily_element.json.

Uses the same deterministic algorithm as the client-side JS fallback:
  index = (days_since_2024-01-01) % num_elements
"""
import json
from datetime import datetime, timezone

START_DATE = datetime(2024, 1, 1, tzinfo=timezone.utc).date()

with open('data/elements_simple.json', 'r') as f:
    elements = json.load(f)

today = datetime.now(timezone.utc).date()
day_index = (today - START_DATE).days
index = day_index % len(elements)

element = elements[index]

daily = {
    "date": today.isoformat(),
    "element": element["Element"],
    "atomicNumber": element["AtomicNumber"],
    "symbol": element["Symbol"]
}

try:
    import random
    from mendeleev import element as mendeleev_element

    el = mendeleev_element(element["AtomicNumber"])
    name = element["Element"]

    # Other atomic numbers in random order, used to find wrong-answer elements
    other_nums = [i for i in range(1, 119) if i != element["AtomicNumber"]]
    random.shuffle(other_nums)

    def make_question(attr, question, fmt_fn, valid_fn):
        """Build a 4-option question dict, or return None if not enough data."""
        correct_val = getattr(el, attr, None)
        if not valid_fn(correct_val):
            return None
        try:
            correct_str = fmt_fn(correct_val)
        except Exception:
            return None

        # options: list of {text, element} — element is the source element name
        options = [{"text": correct_str, "element": name}]

        for num in other_nums:
            if len(options) == 4:
                break
            try:
                oth = mendeleev_element(num)
                oth_val = getattr(oth, attr, None)
                if not valid_fn(oth_val):
                    continue
                oth_str = fmt_fn(oth_val)
                if oth_str != correct_str and not any(o["text"] == oth_str for o in options):
                    options.append({"text": oth_str, "element": oth.name})
            except Exception:
                continue

        if len(options) < 4:
            return None

        random.shuffle(options)
        return {"question": question, "options": options, "correct": correct_str}

    templates = [
        (
            "melting_point",
            f"What is the melting point of {name}?",
            lambda v: f"{v - 273.15:.1f} °C",
            lambda v: v is not None,
        ),
        (
            "boiling_point",
            f"What is the boiling point of {name}?",
            lambda v: f"{v - 273.15:.1f} °C",
            lambda v: v is not None,
        ),
        (
            "density",
            f"What is the density of {name}?",
            lambda v: f"{v} g/cm³",
            lambda v: v is not None,
        ),
        (
            "discovery_year",
            f"When was {name} first discovered?",
            lambda v: str(v),
            lambda v: v is not None,
        ),
        (
            "discoverers",
            f"Who discovered {name}?",
            lambda v: str(v),
            lambda v: v is not None and len(str(v)) > 0,
        ),
        (
            "electronegativity_pauling",
            f"What is the Pauling electronegativity of {name}?",
            lambda v: f"{v:.2f}",
            lambda v: v is not None,
        ),
        (
            "atomic_radius",
            f"What is the atomic radius of {name}?",
            lambda v: f"{v} pm",
            lambda v: v is not None,
        ),
        (
            "abundance_crust",
            f"What is the crustal abundance of {name}?",
            lambda v: f"{v} mg/kg",
            lambda v: v is not None,
        ),
    ]

    random.shuffle(templates)
    quiz = []
    for attr, question, fmt_fn, valid_fn in templates:
        if len(quiz) == 3:
            break
        q = make_question(attr, question, fmt_fn, valid_fn)
        if q:
            quiz.append(q)

    if quiz:
        daily["quiz"] = quiz

except Exception as e:
    print(f"Warning: could not fetch mendeleev data: {e}")

with open('data/daily_element.json', 'w') as f:
    json.dump(daily, f, indent=2)
    f.write('\n')

print(f"Today's element ({today}): {element['Element']} ({element['Symbol']})")
