#!/usr/bin/env python3
"""Generate today's daily element and write to data/daily_element.json.

Uses the same deterministic algorithm as the client-side JS fallback:
  index = (days_since_2024-01-01) % num_elements
"""
import json
from datetime import date

START_DATE = date(2024, 1, 1)

with open('data/elements_simple.json', 'r') as f:
    elements = json.load(f)

today = date.today()
day_index = (today - START_DATE).days
index = day_index % len(elements)

element = elements[index]

daily = {
    "date": today.isoformat(),
    "element": element["Element"],
    "atomicNumber": element["AtomicNumber"],
    "symbol": element["Symbol"]
}

with open('data/daily_element.json', 'w') as f:
    json.dump(daily, f, indent=2)
    f.write('\n')

print(f"Today's element ({today}): {element['Element']} ({element['Symbol']})")
