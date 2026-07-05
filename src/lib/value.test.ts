import { describe, expect, it } from "vitest";
import { buildBoard, starterDemand, rosterCountByGroup, suggestPicks, DEFAULT_SETTINGS } from "./value";
import type { League, Rookie, Scoring } from "../types";

// Minimal league/scoring fixtures mirroring the real shapes.
const scoring: Scoring = {
  positions: "QB|RB|WR|TE|PK|DT|DE|LB|CB|S",
  events: {
    RY: { coef: 0.1, kind: "perUnit", range: null },
    "#R": { coef: 6, kind: "mult", range: null },
    CC: { coef: 0.5, kind: "mult", range: null },
    CY: { coef: 0.1, kind: "perUnit", range: null },
    "#C": { coef: 6, kind: "mult", range: null },
    TK: { coef: 1.5, kind: "mult", range: null },
    AS: { coef: 0.75, kind: "mult", range: null },
    SK: { coef: 4, kind: "mult", range: null },
  },
};

const league: League = {
  id: "21931",
  year: "2026",
  host: "test",
  name: "Test League",
  keeperType: "keeper",
  franchiseCount: 12,
  starters: {
    count: 9,
    slots: [
      { name: "QB", min: 1, max: 1 },
      { name: "RB", min: 1, max: 3 },
      { name: "WR", min: 2, max: 4 },
      { name: "DT+DE", min: 2, max: 3 },
      { name: "LB", min: 2, max: 4 },
      { name: "CB+S", min: 2, max: 4 },
    ],
  },
  franchises: [],
};

let nextId = 1;
function rookie(partial: Partial<Rookie>): Rookie {
  return {
    id: String(nextId++).padStart(4, "0"),
    name: "Player, Test",
    pos: "RB",
    group: "RB",
    team: "FA",
    draftRound: 1,
    draftPick: 1,
    draftTeam: "FA",
    college: null,
    tier: 1,
    stats: {},
    projPointsOverride: null,
    adp: null,
    adpRank: null,
    fcValue: null,
    ...partial,
  };
}

describe("buildBoard", () => {
  it("caps players with no market data at modelWeight * vorPct", () => {
    const pool = [
      rookie({ stats: { rushYd: 1000, rushTD: 8 } }), // no adp, no fc
      rookie({ stats: { rushYd: 500, rushTD: 4 } }),
    ];
    const board = buildBoard(pool, scoring, league, { modelWeight: 0.5, needWeight: 0 });
    // Best no-market player: vorPct = 100 → value = 0.5 * 100 + 0.5 * 0 = 50.
    expect(Math.max(...board.map((r) => r.value))).toBe(50);
  });

  it("averages MFL ADP and FantasyCalc when both exist", () => {
    const pool = [
      // adpPct from adp=1 → 100; fcValue 50 → average 75.
      rookie({ stats: { rushYd: 1000 }, adp: 1, fcValue: 50 }),
      rookie({ stats: { rushYd: 400 } }),
    ];
    const board = buildBoard(pool, scoring, league, { modelWeight: 0, needWeight: 0 });
    expect(board[0].adpPct).toBe(75);
    expect(board[0].value).toBe(75);
  });

  it("assigns dense overall and per-position ranks", () => {
    const pool = [
      rookie({ group: "RB", stats: { rushYd: 900 } }),
      rookie({ group: "WR", pos: "WR", stats: { recYd: 800, rec: 60 } }),
      rookie({ group: "RB", stats: { rushYd: 300 } }),
    ];
    const board = buildBoard(pool, scoring, league, DEFAULT_SETTINGS);
    expect(board.map((r) => r.overallRank)).toEqual([1, 2, 3]);
    const rbRanks = board.filter((r) => r.group === "RB").map((r) => r.posRank);
    expect(rbRanks).toEqual([1, 2]);
  });
});

describe("starterDemand", () => {
  it("maps combined MFL slots (DT+DE, CB+S) onto position groups", () => {
    const demand = starterDemand(league);
    expect(demand.DL).toBe(2);
    expect(demand.DB).toBe(2);
    expect(demand.LB).toBe(2);
    expect(demand.QB).toBe(1);
    expect(demand.TE).toBe(0);
  });
});

describe("rosterCountByGroup", () => {
  it("counts a franchise's roster by group and ignores unknown players", () => {
    const rosters = { "0001": ["p1", "p2", "p3", "missing"] };
    const players = {
      p1: { id: "p1", name: "A", pos: "RB", team: "FA", group: "RB" as const, rookie: false },
      p2: { id: "p2", name: "B", pos: "LB", team: "FA", group: "LB" as const, rookie: false },
      p3: { id: "p3", name: "C", pos: "LB", team: "FA", group: "LB" as const, rookie: false },
    };
    const counts = rosterCountByGroup("0001", rosters, players);
    expect(counts.RB).toBe(1);
    expect(counts.LB).toBe(2);
    expect(counts.WR).toBe(0);
  });
});

describe("suggestPicks", () => {
  const pool = [
    rookie({ group: "RB", stats: { rushYd: 1000, rushTD: 8 }, adp: 1 }),
    rookie({ group: "LB", pos: "LB", stats: { tackleSolo: 80, tackleAst: 38, sack: 3 }, adp: 2 }),
  ];

  it("boosts a position the roster still needs", () => {
    const board = buildBoard(pool, scoring, league, { modelWeight: 0.5, needWeight: 1 });
    const available = new Set(board.map((r) => r.id));
    // Roster full at RB, empty at LB → LB should out-score a similar RB.
    const counts = { QB: 1, RB: 5, WR: 4, TE: 1, DL: 2, LB: 0, DB: 2, PK: 0 };
    const picks = suggestPicks(board, available, league, counts, { modelWeight: 0.5, needWeight: 1 });
    expect(picks[0].rookie.group).toBe("LB");
    expect(picks[0].reasons.join(" ")).toContain("fills a LB need");
  });

  it("cites FantasyCalc as the market reason when there is no ADP", () => {
    const fcOnly = [rookie({ group: "WR", pos: "WR", stats: { recYd: 700, rec: 55 }, fcValue: 88 })];
    const board = buildBoard(fcOnly, scoring, league, DEFAULT_SETTINGS);
    const picks = suggestPicks(board, new Set(board.map((r) => r.id)), league, null);
    expect(picks[0].reasons.join(" ")).toContain("FantasyCalc 88/100");
  });

  it("only suggests available players", () => {
    const board = buildBoard(pool, scoring, league, DEFAULT_SETTINGS);
    const taken = board[0].id;
    const available = new Set(board.filter((r) => r.id !== taken).map((r) => r.id));
    const picks = suggestPicks(board, available, league, null);
    expect(picks.every((p) => p.rookie.id !== taken)).toBe(true);
  });
});
