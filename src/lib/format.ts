import type { League, PosGroup } from "../types";

/** "Love, Jeremiyah" -> "Jeremiyah Love". Leaves already-natural names alone. */
export function displayName(mflName: string): string {
  const idx = mflName.indexOf(",");
  if (idx === -1) return mflName;
  const last = mflName.slice(0, idx).trim();
  const first = mflName.slice(idx + 1).trim();
  return first ? `${first} ${last}` : last;
}

export function franchiseName(league: League, id: string | null): string {
  if (!id) return "—";
  return league.franchises.find((f) => f.id === id)?.name ?? id;
}

export function franchiseAbbrev(league: League, id: string | null): string {
  if (!id) return "—";
  const f = league.franchises.find((f) => f.id === id);
  if (!f) return id;
  return f.abbrev || f.name.split(" ")[0];
}

export const GROUP_COLOR: Record<PosGroup, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  DL: "var(--pos-dl)",
  LB: "var(--pos-lb)",
  DB: "var(--pos-db)",
  PK: "var(--pos-pk)",
};

export function fmtPick(round: number | null, pick: number | null): string {
  if (!round) return "UDFA";
  return pick ? `R${round}.${String(pick).padStart(2, "0")}` : `R${round}`;
}

/**
 * Google AI Mode (Gemini-powered) search URL for a quick player lookup.
 * `udm=50` opens Google's AI Mode; falls back to normal results if unavailable.
 */
export function aiSearchUrl(query: string): string {
  return `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
}

/** A fantasy-context AI search query for a rookie ("First Last TEAM POS NFL …"). */
export function playerSearchQuery(opts: { name: string; team: string; pos: string }): string {
  const who = displayName(opts.name);
  const team = opts.team && opts.team !== "FA" ? ` ${opts.team}` : "";
  return `${who}${team} ${opts.pos} NFL 2026 rookie fantasy dynasty outlook`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
