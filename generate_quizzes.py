#!/usr/bin/env python3
"""Pre-generate quiz questions for every element and write to data/element_quizzes.json.

Uses a deterministic seed (atomic number) so the output is reproducible.
Run this once; the result is committed to the repo and served statically.
"""
import json
import random

with open('data/elements_simple.json', 'r') as f:
    elements = json.load(f)

try:
    from mendeleev import element as mendeleev_element
except ImportError as e:
    raise SystemExit(f"mendeleev not installed: {e}")

def make_question(el, name, attr, question, fmt_fn, valid_fn, rng, other_elements):
    correct_val = getattr(el, attr, None)
    if not valid_fn(correct_val):
        return None
    try:
        correct_str = fmt_fn(correct_val)
    except Exception:
        return None

    options = [{"text": correct_str, "element": name}]
    candidates = list(other_elements)
    rng.shuffle(candidates)

    for num in candidates:
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

    rng.shuffle(options)
    return {"question": question, "options": options, "correct": correct_str}


all_quizzes = {}

for elem_data in elements:
    atomic_num = elem_data["AtomicNumber"]
    name = elem_data["Element"]

    rng = random.Random(atomic_num)

    try:
        el = mendeleev_element(atomic_num)
    except Exception as e:
        print(f"  Warning: could not load {name}: {e}")
        all_quizzes[name] = []
        continue

    other_nums = [i for i in range(1, 119) if i != atomic_num]

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

    shuffled_templates = list(templates)
    rng.shuffle(shuffled_templates)

    quiz = []
    for attr, question, fmt_fn, valid_fn in shuffled_templates:
        if len(quiz) == 3:
            break
        q = make_question(el, name, attr, question, fmt_fn, valid_fn, rng, other_nums)
        if q:
            quiz.append(q)

    all_quizzes[name] = quiz
    print(f"  {name}: {len(quiz)} questions")

with open('data/element_quizzes.json', 'w') as f:
    json.dump(all_quizzes, f, indent=2)
    f.write('\n')

print(f"\nGenerated quizzes for {len(all_quizzes)} elements -> data/element_quizzes.json")
