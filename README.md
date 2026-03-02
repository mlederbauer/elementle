# Elementle

A Wor(l)dle-style daily guessing game for the periodic table
## How to play

**Main game** — guess the secret element of the day. After each guess, letter tiles show how close you are (green = right letter, right position; yellow = right letter, wrong position). The periodic table grid and proximity heat boxes give you additional positional hints.

**Bonus Round 1 — Neighbors** — guess all elements neighboring today's element in the periodic table.

**Bonus Round 2 — Atomic Mass** — guess the atomic mass (in u) within 1 u.

**Bonus Round 3 — True or False?** — two multiple-choice questions about today's element. Only one option per question is correct.

A new element is selected automatically every day at midnight UTC.

---


## Running locally

Open `index.html` directly in a browser, or serve the repo root with any static file server:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

> Note: `fetch()` calls require a server (won't work with `file://` URLs in most browsers).

---

## Daily element update

GitHub Actions runs `.github/workflows/daily.yml` every day at 00:00 UTC:
1. Installs Python dependencies (`mendeleev`)
2. Runs `generate_daily.py`, which writes `data/daily_element.json`
3. Commits and pushes the updated file

The JS fallback (`getDailyElement` in `script.js`) uses the same deterministic formula (days since 2024-01-01 UTC, modulo 118) so the correct element is shown even if the JSON hasn't loaded yet.

---

Logo from [FreeSVG](https://freesvg.org/prismatic-chemistry). Created by Stefan P. Schmid and Magdalena Lederbauer. We hope you enjoy it as much as we do!