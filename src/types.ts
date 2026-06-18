// Shared types mirroring the normalized JSON written by scripts/sync-mfl.mjs.

export type PosGroup = "QB" | "RB" | "WR" | "TE" | "PK" | "DL" | "LB" | "DB";

export interface StarterSlot {
  name: string; // e.g. "QB", "DT+DE", "CB+S"
  min: number;
  max: number;
}

export interface Franchise {
  id: string;
  name: string;
  abbrev: string | null;
  division: string | null;
  logo: string | null;
  icon: string | null;
}

export interface League {
  id: string;
  year: string;
  host: string;
  name: string;
  keeperType: string;
  franchiseCount: number;
  starters: { count: number; slots: StarterSlot[] };
  franchises: Franchise[];
}

export interface ScoringEvent {
  coef: number;
  kind: "mult" | "perUnit" | "flat";
  range: string | null;
}

export interface Scoring {
  positions: string;
  events: Record<string, ScoringEvent>;
}

export type StatLine = Partial<Record<StatKey, number>>;

export type StatKey =
  | "passYd"
  | "passTD"
  | "passInt"
  | "rushYd"
  | "rushTD"
  | "recYd"
  | "recTD"
  | "rec"
  | "tackleSolo"
  | "tackleAst"
  | "sack"
  | "tfl"
  | "ff"
  | "pd"
  | "defTD";

export interface Rookie {
  id: string;
  name: string; // "Last, First"
  pos: string; // raw MFL position (QB, RB, DT, DE, CB, S, ...)
  group: PosGroup;
  team: string;
  draftRound: number | null;
  draftPick: number | null;
  draftTeam: string;
  college: string | null;
  tier: number;
  stats: StatLine;
  projPointsOverride: number | null;
  adp: number | null;
  adpRank: number | null;
  fcValue: number | null; // 0-100 FantasyCalc dynasty value (higher = better)
}

export type Rosters = Record<string, string[]>; // franchiseId -> playerIds

export interface PlayerLite {
  id: string;
  name: string;
  pos: string;
  team: string;
  group: PosGroup | null;
  rookie: boolean;
}

export type PlayerMap = Record<string, PlayerLite>;

export type AdpMap = Record<
  string,
  { avgPick: number; rank: number; minPick: number; maxPick: number; drafts: number }
>;

export interface Meta {
  syncedAt: string;
  year: string;
  leagueId: string;
  rookieCount: number;
}
