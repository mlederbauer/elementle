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

---

## Leaderboard & friend comparison

### How it works

* **Username** — click the 👤 button in the header (or wait for the first-visit prompt) to choose a name.  Your name is stored locally and used to key your stats.
* **Local friend leaderboard** — open Stats → Leaderboard, then use **Copy My Stats Code** to get a short code.  Send it to a friend; they paste it into the *Import* box in their own Stats modal.  The leaderboard table updates immediately and ranks everyone by win-rate.
* **Daily global leaderboard** — when a Supabase backend is configured (see below), every player's score for the current day is submitted automatically after they finish.  Opening Stats shows a live distribution chart and ranked table under *Today's Global Scores*.

---

### Setting up the Supabase backend (optional)

The daily global leaderboard requires a small free database.  Setup takes about 5 minutes.

#### 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name (e.g. `elementle`) and a strong database password, then wait for provisioning.

#### 2 — Create the `daily_scores` table

Open the **SQL Editor** in your Supabase dashboard and run:

```sql
CREATE TABLE daily_scores (
    id          BIGSERIAL PRIMARY KEY,
    username    TEXT        NOT NULL,
    game_date   DATE        NOT NULL,
    attempts    SMALLINT    NOT NULL,   -- number of guesses used (1-6); 0 = did not solve
    won         BOOLEAN     NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (username, game_date)        -- one entry per player per day
);

ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read today's scores
CREATE POLICY "public read"   ON daily_scores FOR SELECT USING (true);
-- Allow any player to submit / update their own score
CREATE POLICY "public insert" ON daily_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "public update" ON daily_scores FOR UPDATE USING (true);
```

#### 3 — Add your credentials to `js/config.js`

Find your **Project URL** and **anon/public key** under *Project Settings → API* and fill them in:

```js
const SUPABASE_URL      = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

> The anon key is safe to commit — Supabase's Row Level Security policies control what anonymous clients can read/write.

#### 4 — Deploy

Push to `main`; GitHub Actions will deploy the updated site to GitHub Pages automatically.