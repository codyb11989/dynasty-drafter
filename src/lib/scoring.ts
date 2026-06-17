import type { Rookie, Scoring, StatKey, StatLine } from "../types";

// Map our projection stat keys to the MFL scoring event codes pulled from the
// league rules. The league's coefficients (scoring.json) stay authoritative;
// we just multiply projected stats by them.
export const STAT_TO_EVENT: Record<StatKey, string> = {
  passYd: "PY",
  passTD: "#P",
  passInt: "IN",
  rushYd: "RY",
  rushTD: "#R",
  recYd: "CY",
  recTD: "#C",
  rec: "CC",
  tackleSolo: "TK",
  tackleAst: "AS",
  sack: "SK",
  tfl: "TKL",
  ff: "FF",
  pd: "PD",
  defTD: "#T",
};

export const STAT_LABEL: Record<StatKey, string> = {
  passYd: "Pass Yds",
  passTD: "Pass TD",
  passInt: "INT",
  rushYd: "Rush Yds",
  rushTD: "Rush TD",
  recYd: "Rec Yds",
  recTD: "Rec TD",
  rec: "Rec",
  tackleSolo: "Solo Tkl",
  tackleAst: "Asst Tkl",
  sack: "Sacks",
  tfl: "TFL",
  ff: "FF",
  pd: "Pass Def",
  defTD: "Def TD",
};

// Stat keys relevant to each position group, in display order.
export const GROUP_STATS: Record<string, StatKey[]> = {
  QB: ["passYd", "passTD", "passInt", "rushYd", "rushTD"],
  RB: ["rushYd", "rushTD", "rec", "recYd", "recTD"],
  WR: ["rec", "recYd", "recTD", "rushYd"],
  TE: ["rec", "recYd", "recTD"],
  PK: [],
  DL: ["tackleSolo", "tackleAst", "sack", "tfl", "ff", "pd"],
  LB: ["tackleSolo", "tackleAst", "sack", "tfl", "ff", "pd"],
  DB: ["tackleSolo", "tackleAst", "sack", "tfl", "pd", "ff"],
};

/** Projected fantasy points for a statline under the league's scoring. */
export function scoreStatLine(stats: StatLine, scoring: Scoring): number {
  let pts = 0;
  for (const key of Object.keys(stats) as StatKey[]) {
    const val = stats[key];
    if (val == null) continue;
    const event = scoring.events[STAT_TO_EVENT[key]];
    if (event) pts += val * event.coef;
  }
  return pts;
}

/** Points for a rookie: explicit override (e.g. kickers) or scored statline. */
export function projectedPoints(rookie: Rookie, scoring: Scoring): number {
  const raw =
    rookie.projPointsOverride != null
      ? rookie.projPointsOverride
      : scoreStatLine(rookie.stats, scoring);
  return Math.round(raw * 10) / 10;
}

/** Per-stat point contributions, for the "how this is scored" breakdown. */
export function pointsBreakdown(
  rookie: Rookie,
  scoring: Scoring,
): { key: StatKey; label: string; stat: number; coef: number; points: number }[] {
  const rows: { key: StatKey; label: string; stat: number; coef: number; points: number }[] = [];
  for (const key of Object.keys(rookie.stats) as StatKey[]) {
    const stat = rookie.stats[key];
    if (stat == null) continue;
    const event = scoring.events[STAT_TO_EVENT[key]];
    if (!event) continue;
    rows.push({
      key,
      label: STAT_LABEL[key],
      stat,
      coef: event.coef,
      points: Math.round(stat * event.coef * 10) / 10,
    });
  }
  return rows.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}
