import type { RankedRookie } from "./value";

export type SortKey = "rank" | "proj" | "vor" | "adp" | "value";

/** Sensible default direction when a column is first clicked: 1 = ascending, -1 = descending. */
export const SORT_DEFAULT_DIR: Record<SortKey, 1 | -1> = {
  rank: 1,
  proj: -1,
  vor: -1,
  adp: 1, // lower ADP (drafted earlier) is "better"
  value: -1,
};

export const SORT_LABEL: Record<SortKey, string> = {
  rank: "#",
  proj: "Proj",
  vor: "VOR",
  adp: "ADP",
  value: "Value",
};

function sortValue(r: RankedRookie, key: SortKey): number {
  if (key === "rank") return r.overallRank;
  if (key === "adp") return r.adp ?? 9999;
  return r[key];
}

export function sortRows(rows: RankedRookie[], key: SortKey, dir: 1 | -1): RankedRookie[] {
  return [...rows].sort((a, b) => (sortValue(a, key) - sortValue(b, key)) * dir);
}
