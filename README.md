# 🐃 Water Buffaloes — Dynasty IDP Draft Helper

A league hub + draft-day helper for the **Loyal Order of Water Buffaloes**, a
dynasty IDP league on [MyFantasyLeague](https://www.myfantasyleague.com). Built
to make the in-person **rookie draft** painless: a live best-available board you
can mark up as picks happen, a **Suggest My Next Pick** button that weighs value
against your roster needs, plus reference pages for rules, scoring, and rosters.

It's a static site that **works fully offline** once data is synced — perfect for
a draft table with flaky Wi‑Fi. Your picks and edits are saved in the browser.

---

## Quick start

```bash
npm install
npm run sync      # pull league data from MFL into public/data/ (needs internet)
npm run dev       # open the app at http://localhost:5173
```

That's it. Open the app, go to **Settings**, and pick your franchise.

## Draft-day workflow

1. **Before the draft** (with internet): run `npm run sync` to refresh rosters,
   scoring, the rookie pool, and ADP. Then `npm run dev` (or open the built site).
2. **At the table** (offline is fine): on the **Draft Helper** page, as each pick
   is announced, tap **Taken** on that player (or **Mine** when it's your pick).
   - The board removes them and **recalculates** instantly.
   - The **Suggest My Next Pick** panel always shows your best pick, weighted by
     who you still need to start (2 DL / 2 LB / 2 DB + offense).
   - Wrong tap? **Undo last**, or **undo** on any individual player.
3. Disagree with a projection? Click a player's name to see exactly how their
   points are scored and **hand-tune their stat line** — the whole board re-ranks.

## How players are valued

Value is computed from **your league's actual scoring**, not generic rankings —
that's what surfaces IDP value that offense-only rankings miss.

1. **Projected stat line** — a transparent prior based on position × NFL draft
   capital (`scripts/projections.mjs`). A starting point; edit any player in-app.
2. **Projected points** — that stat line run through the exact MFL scoring rules
   (`scoring.json`). Tackle-heavy here: solo tackle 1.5, sack 4, TFL 2, FF 4.
3. **VOR (value over replacement)** — points above a replacement-level rookie at
   that position, using your real starting lineup. This is the positional-scarcity
   adjustment (e.g. why an elite tackle LB is worth a high pick in this league).
4. **Market blend** — combined with consensus rookie **ADP** where it exists.
   Note ADP only covers offense (most dynasty leagues aren't IDP), so the
   **Model ↔ Market** slider in Settings lets you decide how much to trust each.
   Roster-need weighting for suggestions is adjustable there too.

## Updating data

Re-run `npm run sync` whenever you want fresh rosters/ADP. It writes normalized
JSON to `public/data/`. No login is required — this league's MFL export endpoints
are publicly readable. League is configurable via env vars if needed:

```bash
MFL_LEAGUE=21931 MFL_YEAR=2026 MFL_HOST=www46.myfantasyleague.com npm run sync
```

## Deploying (optional)

To let leaguemates view rules/rosters online, build and host the static output:

```bash
npm run build     # outputs to dist/
```

`dist/` is a plain static site (uses hash routing, base `./`) — drop it on
Vercel, Netlify, GitHub Pages, or any static host. Commit a fresh `public/data/`
(or run sync in CI) so the deployed site has current data.

## Project structure

```
scripts/
  sync-mfl.mjs       MFL fetch + normalize -> public/data/*.json
  projections.mjs    rookie stat-line projection model (tunable priors)
public/data/         generated league data (committed so the app loads offline)
src/
  lib/scoring.ts     apply MFL scoring to a stat line -> points
  lib/value.ts       VOR, ADP blend, board ranking, "suggest pick" logic
  hooks/useBoard.ts  ties data + your edits/picks into the ranked board
  store/draftStore.ts persisted draft state (picks, your team, tuning)
  pages/             Draft Helper, Rookie Board, Rosters, Rules & Scoring, Settings
```

## Notes & limitations

- Projections are a **baseline** — landing spot and depth chart matter more than
  draft slot, which is why ADP is blended in and every player is hand-tunable.
- Rookie ADP is offense-only; lean on the model (and your own reads) for IDP.
- Draft state lives in your browser's `localStorage`. Use the same
  browser/profile at the draft, and don't clear site data mid-draft.
