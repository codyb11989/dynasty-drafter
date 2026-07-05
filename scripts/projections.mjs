// ---------------------------------------------------------------------------
// Rookie projection model
// ---------------------------------------------------------------------------
// Produces a *season statline* for a rookie from a transparent prior keyed on
// (fantasy position) x (NFL draft capital). The app then applies the league's
// actual MFL scoring rules to the statline to get projected fantasy points, so:
//   - your scoring system stays the single source of truth, and
//   - editing a player's stats (or the scoring) recomputes points live.
//
// These priors are a STARTING BASELINE, deliberately simple and hand-tunable.
// Landing spot / depth chart matter more than draft slot for fantasy, which is
// why the app blends this with market ADP. Edit the tables below (or a player's
// stats in the app) to inject your own read.
//
// Stat keys map to MFL scoring event codes in the app (see src/lib/scoring.ts):
//   passYd #P? -> PY, passTD -> #P, passInt -> IN,
//   rushYd -> RY, rushTD -> #R, recYd -> CY, recTD -> #C, rec -> CC,
//   tackleSolo -> TK, tackleAst -> AS, sack -> SK, tfl -> TKL,
//   ff -> FF, pd -> PD, defTD -> #T
// ---------------------------------------------------------------------------

// Map raw MFL positions to fantasy position groups used for projection + value.
export const POS_GROUP = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  PK: "PK",
  DT: "DL",
  DE: "DL",
  LB: "LB",
  CB: "DB",
  S: "DB",
};

// Draft-capital tiers from NFL overall pick. Missing draft data => UDFA.
//   tier 0: top of round 1      (picks 1-12)
//   tier 1: rest of round 1     (13-32)
//   tier 2: round 2             (33-64)
//   tier 3: round 3             (65-105)
//   tier 4: day 3 (rounds 4-7)  (106-262)
//   tier 5: UDFA / unknown
export function capitalTier(draftRound, draftPick) {
  const r = Number(draftRound) || 0;
  const p = Number(draftPick) || 0;
  if (!r) return 5; // undrafted / unknown
  // Tier straight from the round: compensatory picks stretch rounds 3+ past a
  // synthesized 32-picks-per-round "overall", which used to spill late round-3
  // picks into the day-3 tier.
  if (r === 1) return p && p <= 12 ? 0 : 1;
  if (r === 2) return 2;
  if (r === 3) return 3;
  return 4;
}

// Season statline priors: PRIORS[group][tier] = { stat: value, ... }
// Indexed by tier 0..5. (PK is handled with a flat points override instead.)
const PRIORS = {
  // QB priors are intentionally conservative: this is a 1-2 QB league (not
  // superflex) and many rookie QBs don't start / produce in year one, so their
  // expected redraft-year points are discounted. ADP blend fine-tunes the top.
  QB: [
    { passYd: 2600, passTD: 15, passInt: 11, rushYd: 320, rushTD: 3 }, // elite R1
    { passYd: 2100, passTD: 12, passInt: 10, rushYd: 240, rushTD: 2 }, // R1
    { passYd: 1100, passTD: 6, passInt: 6, rushYd: 140, rushTD: 1 }, // R2
    { passYd: 500, passTD: 3, passInt: 3, rushYd: 70, rushTD: 0 }, // R3
    { passYd: 180, passTD: 1, passInt: 1, rushYd: 30, rushTD: 0 }, // day 3
    { passYd: 60, passTD: 0, passInt: 1, rushYd: 10, rushTD: 0 }, // UDFA
  ],
  RB: [
    { rushYd: 1000, rushTD: 8, rec: 45, recYd: 340, recTD: 2 },
    { rushYd: 820, rushTD: 6, rec: 38, recYd: 290, recTD: 1 },
    { rushYd: 560, rushTD: 4, rec: 28, recYd: 200, recTD: 1 },
    { rushYd: 360, rushTD: 2, rec: 18, recYd: 130, recTD: 1 },
    { rushYd: 190, rushTD: 1, rec: 10, recYd: 70, recTD: 0 },
    { rushYd: 70, rushTD: 0, rec: 5, recYd: 35, recTD: 0 },
  ],
  WR: [
    { rec: 60, recYd: 880, recTD: 6, rushYd: 30 },
    { rec: 52, recYd: 760, recTD: 5, rushYd: 20 },
    { rec: 42, recYd: 580, recTD: 3 },
    { rec: 30, recYd: 380, recTD: 2 },
    { rec: 18, recYd: 220, recTD: 1 },
    { rec: 8, recYd: 95, recTD: 0 },
  ],
  TE: [
    { rec: 50, recYd: 560, recTD: 4 },
    { rec: 44, recYd: 490, recTD: 3 },
    { rec: 32, recYd: 350, recTD: 2 },
    { rec: 22, recYd: 230, recTD: 1 },
    { rec: 12, recYd: 120, recTD: 1 },
    { rec: 6, recYd: 55, recTD: 0 },
  ],
  // IDP — tuned for this league's tackle-heavy scoring (TK 1.5 / AS 0.75 / SK 4 / TKL 2 / FF 4 / PD 1.5)
  LB: [
    { tackleSolo: 80, tackleAst: 38, sack: 2.5, tfl: 8, ff: 1.5, pd: 4, defTD: 0.2 },
    { tackleSolo: 70, tackleAst: 33, sack: 2, tfl: 6, ff: 1, pd: 4, defTD: 0.1 },
    { tackleSolo: 58, tackleAst: 27, sack: 1.5, tfl: 5, ff: 1, pd: 3 },
    { tackleSolo: 44, tackleAst: 20, sack: 1, tfl: 3, ff: 0.5, pd: 2 },
    { tackleSolo: 27, tackleAst: 12, sack: 0.5, tfl: 2, pd: 1 },
    { tackleSolo: 12, tackleAst: 6, sack: 0, tfl: 1, pd: 0 },
  ],
  DL: [
    // Edge-weighted; interior DTs come in a notch lower via the DT discount below.
    { tackleSolo: 40, tackleAst: 16, sack: 7, tfl: 11, ff: 2, pd: 2, defTD: 0.2 },
    { tackleSolo: 34, tackleAst: 14, sack: 5.5, tfl: 9, ff: 1.5, pd: 2 },
    { tackleSolo: 28, tackleAst: 12, sack: 4, tfl: 7, ff: 1, pd: 1 },
    { tackleSolo: 20, tackleAst: 9, sack: 2.5, tfl: 4, ff: 0.5 },
    { tackleSolo: 13, tackleAst: 6, sack: 1.5, tfl: 3 },
    { tackleSolo: 6, tackleAst: 3, sack: 0.5, tfl: 1 },
  ],
  DB: [
    // Safety-weighted; cover corners trimmed via the CB discount below.
    { tackleSolo: 62, tackleAst: 24, sack: 1, tfl: 3, ff: 1, pd: 8, defTD: 0.2 },
    { tackleSolo: 54, tackleAst: 21, sack: 0.5, tfl: 2, ff: 1, pd: 7 },
    { tackleSolo: 45, tackleAst: 17, tfl: 2, pd: 6 },
    { tackleSolo: 34, tackleAst: 13, pd: 4 },
    { tackleSolo: 22, tackleAst: 9, pd: 3 },
    { tackleSolo: 10, tackleAst: 4, pd: 1 },
  ],
};

// Within-group role discounts: interior DL and cover CBs score less than the
// edge/safety archetype the DL/DB tables are tuned for.
function roleScale(rawPos) {
  if (rawPos === "DT") return 0.82; // interior linemen: fewer sacks/tackles
  if (rawPos === "CB") return 0.86; // cover corners: fewer tackles than safeties
  return 1;
}

// Smooth intra-tier nudge so earlier picks edge out later ones (breaks ties,
// avoids hard cliffs at tier boundaries). +/-6% across the pick range.
function pickNudge(draftRound, draftPick) {
  const r = Number(draftRound) || 0;
  if (!r) return 0.97;
  const overall = (r - 1) * 32 + (Number(draftPick) || 16);
  // earlier overall pick -> slightly higher
  const f = Math.max(0, Math.min(1, (overall - 1) / 261));
  return 1.06 - 0.12 * f;
}

const PK_FLAT_POINTS = 70; // rookie kicker: low, replaceable, capital-agnostic

// Returns { stats: {...}, projPointsOverride?: number, group, tier }
export function projectRookie({ position, draft_round, draft_pick }) {
  const group = POS_GROUP[position] || "DB";
  const tier = capitalTier(draft_round, draft_pick);

  if (group === "PK") {
    return { group, tier, stats: {}, projPointsOverride: PK_FLAT_POINTS };
  }

  const base = PRIORS[group]?.[tier] ?? {};
  const scale = roleScale(position) * pickNudge(draft_round, draft_pick);
  const stats = {};
  for (const [k, v] of Object.entries(base)) {
    stats[k] = round1(v * scale);
  }
  return { group, tier, stats };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
