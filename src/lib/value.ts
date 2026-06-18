import type { League, PlayerMap, PosGroup, Rookie, Rosters, Scoring, StarterSlot } from "../types";
import { projectedPoints } from "./scoring";

// Map a league starter-slot name (which may combine positions) to a group.
const SLOT_TO_GROUP: Record<string, PosGroup> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  PK: "PK",
  "DT+DE": "DL",
  DL: "DL",
  LB: "LB",
  "CB+S": "DB",
  DB: "DB",
};

export const ALL_GROUPS: PosGroup[] = ["QB", "RB", "WR", "TE", "DL", "LB", "DB", "PK"];

export const GROUP_LABEL: Record<PosGroup, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  DL: "DL",
  LB: "LB",
  DB: "DB",
  PK: "K",
};

// How deep into each position's rookie pool the "replacement level" sits,
// relative to franchise count. Positions you start more of (or that drain
// faster in a rookie draft) get a deeper baseline. Tunable.
const BASELINE_MULT: Record<PosGroup, number> = {
  // QB/PK sit shallow on purpose: in a 1-2 QB league you rarely need a rookie
  // at these spots (veterans cover them), so replacement is ~the best rookie
  // and only a truly elite rookie QB earns real VOR. Skill + IDP run deeper.
  QB: 0.2,
  RB: 1.4,
  WR: 1.6,
  TE: 0.7,
  DL: 0.9,
  LB: 1.0,
  DB: 1.0,
  PK: 0.2,
};

// Dynasty positional value multipliers applied to raw projections BEFORE VOR is
// computed. This normalises cross-position comparison in an IDP league where raw
// tackle points inflate IDP totals well above offensive production.
// IDP positions carry a discount because they have shorter dynasty windows,
// higher injury/scheme risk, and the market prices them below equivalent-scoring
// offensive players. These do NOT affect the "Proj pts" column shown in the UI —
// they only influence the VOR and value ranking.
const DYNASTY_SCALE: Record<PosGroup, number> = {
  QB: 0.80,  // 1QB format — hard to start multiples; veterans dominate
  RB: 0.95,  // High value but shorter careers than WR
  WR: 1.00,  // Benchmark: longest careers, highest long-term scarcity
  TE: 0.90,  // Premium at the very top, easy to stream below that
  PK: 0.25,  // Irrelevant in dynasty
  DL: 0.60,  // IDP: shorter careers, scheme-dependent
  LB: 0.55,  // IDP: most plentiful NFL position, career length ~4-5 yrs
  DB: 0.60,  // IDP: CB premium helps, but still shorter than skill positions
};

export interface ValueSettings {
  modelWeight: number; // 0..1 weight on the projection/VOR model (rest is market/ADP)
  needWeight: number; // 0..1 how much roster need tilts the suggestion
}

export const DEFAULT_SETTINGS: ValueSettings = { modelWeight: 0.5, needWeight: 0.35 };

export interface RankedRookie extends Rookie {
  proj: number; // projected fantasy points
  vor: number; // points above positional replacement
  vorPct: number; // 0..100 percentile of VOR across the pool
  adpPct: number | null; // 0..100 market score from ADP
  value: number; // 0..100 blended ranking score
  overallRank: number;
  posRank: number;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Build the full ranked board from the rookie pool. */
export function buildBoard(
  rookies: Rookie[],
  scoring: Scoring,
  league: League,
  settings: ValueSettings = DEFAULT_SETTINGS,
): RankedRookie[] {
  const fc = league.franchiseCount || 10;
  const proj = new Map<string, number>();
  for (const r of rookies) proj.set(r.id, projectedPoints(r, scoring));

  // Dynasty-adjusted projections for VOR computation only (raw proj shown in UI).
  const dynProj = new Map<string, number>();
  for (const r of rookies) dynProj.set(r.id, proj.get(r.id)! * (DYNASTY_SCALE[r.group] ?? 1));

  // Replacement level per group using dynasty-adjusted projections.
  const replacement: Partial<Record<PosGroup, number>> = {};
  for (const g of ALL_GROUPS) {
    const ptsDesc = rookies
      .filter((r) => r.group === g)
      .map((r) => dynProj.get(r.id)!)
      .sort((a, b) => b - a);
    if (ptsDesc.length === 0) {
      replacement[g] = 0;
      continue;
    }
    const idx = clamp(Math.round(fc * BASELINE_MULT[g]) - 1, 0, ptsDesc.length - 1);
    replacement[g] = ptsDesc[idx];
  }

  // VOR uses dynasty-adjusted pts; raw proj (p) is kept for display only.
  const withVor = rookies.map((r) => {
    const p = proj.get(r.id)!;
    const dp = dynProj.get(r.id)!;
    const vor = dp - (replacement[r.group] ?? 0);
    return { r, p, vor };
  });
  const vorSorted = [...withVor].sort((a, b) => a.vor - b.vor);
  const n = vorSorted.length;
  const vorPctById = new Map<string, number>();
  vorSorted.forEach((x, i) => vorPctById.set(x.r.id, n > 1 ? (i / (n - 1)) * 100 : 100));

  // Market score from ADP (lower avg pick = higher), spread over a draft horizon.
  const horizon = Math.max(20, fc * 5);
  const mw = clamp(settings.modelWeight, 0, 1);

  const ranked: RankedRookie[] = withVor.map(({ r, p, vor }) => {
    const vorPct = vorPctById.get(r.id)!;
    const adpPctMFL = r.adp != null ? 100 * (1 - clamp((r.adp - 1) / horizon, 0, 1)) : null;
    const adpPctFC = r.fcValue ?? null;
    const adpPcts = ([adpPctMFL, adpPctFC] as (number | null)[]).filter((v): v is number => v != null);
    const adpPct = adpPcts.length > 0 ? adpPcts.reduce((a, b) => a + b, 0) / adpPcts.length : null;
    // Players with no market data use only the model fraction of vorPct (adpPct treated as 0).
    // This ensures the model-vs-market slider has genuine effect: moving left (pure market)
    // pushes unranked players to the bottom; moving right (pure model) relies on VOR alone.
    const value = mw * vorPct + (1 - mw) * (adpPct ?? 0);
    return {
      ...r,
      proj: p,
      vor: Math.round(vor * 10) / 10,
      vorPct: Math.round(vorPct * 10) / 10,
      adpPct: adpPct != null ? Math.round(adpPct * 10) / 10 : null,
      value: Math.round(value * 10) / 10,
      overallRank: 0,
      posRank: 0,
    };
  });

  ranked.sort((a, b) => b.value - a.value || b.proj - a.proj);
  ranked.forEach((r, i) => (r.overallRank = i + 1));

  const posCounter: Partial<Record<PosGroup, number>> = {};
  for (const r of ranked) {
    posCounter[r.group] = (posCounter[r.group] ?? 0) + 1;
    r.posRank = posCounter[r.group]!;
  }
  return ranked;
}

// ---- Roster need (for "Suggest my next pick") ------------------------------

/** Starting requirement per group from the league's lineup rules. */
export function starterDemand(league: League): Record<PosGroup, number> {
  const demand = Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<PosGroup, number>;
  for (const slot of league.starters.slots as StarterSlot[]) {
    const g = SLOT_TO_GROUP[slot.name];
    if (g) demand[g] += slot.min; // use the required minimum as core need
  }
  return demand;
}

/** Count a franchise's current roster by group, using the full player map. */
export function rosterCountByGroup(
  franchiseId: string | null,
  rosters: Rosters,
  players: PlayerMap,
): Record<PosGroup, number> {
  const counts = Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<PosGroup, number>;
  if (!franchiseId) return counts;
  for (const pid of rosters[franchiseId] ?? []) {
    const g = players[pid]?.group;
    if (g) counts[g] += 1;
  }
  return counts;
}

export interface Suggestion {
  rookie: RankedRookie;
  score: number;
  reasons: string[];
}

/**
 * Suggest the next pick: blends overall value with how much your roster needs
 * each position. `myCounts` should already include rookies you've drafted today.
 */
export function suggestPicks(
  board: RankedRookie[],
  available: Set<string>,
  league: League,
  myCounts: Record<PosGroup, number> | null,
  settings: ValueSettings = DEFAULT_SETTINGS,
  limit = 5,
): Suggestion[] {
  const demand = starterDemand(league);
  const avail = board.filter((r) => available.has(r.id));

  // Need score per group: 0..1, higher when you're below your starting demand.
  const need: Record<PosGroup, number> = Object.fromEntries(
    ALL_GROUPS.map((g) => {
      if (!myCounts) return [g, 0];
      const deficit = Math.max(0, demand[g] - myCounts[g]);
      const depthGap = Math.max(0, demand[g] + 1 - myCounts[g]); // some bench depth
      return [g, clamp(0.7 * deficit + 0.3 * depthGap, 0, 3) / 3];
    }),
  ) as Record<PosGroup, number>;

  const nw = clamp(settings.needWeight, 0, 1);
  const scored = avail.map((r) => {
    const needScore = need[r.group] ?? 0;
    // value is 0..100; fold in need as a multiplicative-ish tilt
    const score = r.value * (1 - nw) + r.value * nw * (0.4 + 1.2 * needScore);
    const reasons: string[] = [];
    reasons.push(`${ordinal(r.posRank)} ${GROUP_LABEL[r.group]} on the board`);
    if (r.adp != null) reasons.push(`market ADP ${r.adp.toFixed(1)}`);
    if (myCounts && need[r.group] > 0.5) reasons.push(`fills a ${GROUP_LABEL[r.group]} need`);
    if (r.vor > 0) reasons.push(`+${r.vor.toFixed(0)} pts over replacement`);
    return { rookie: r, score: Math.round(score * 10) / 10, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
