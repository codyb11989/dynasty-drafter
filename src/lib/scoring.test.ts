import { describe, expect, it } from "vitest";
import { scoreStatLine, projectedPoints, pointsBreakdown } from "./scoring";
import type { Rookie, Scoring } from "../types";

const scoring: Scoring = {
  positions: "",
  events: {
    RY: { coef: 0.1, kind: "perUnit", range: null },
    "#R": { coef: 6, kind: "mult", range: null },
    TK: { coef: 1.5, kind: "mult", range: null },
    IN: { coef: -2, kind: "mult", range: null },
  },
};

const base: Rookie = {
  id: "1",
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
};

describe("scoreStatLine", () => {
  it("multiplies stats by the league coefficients", () => {
    expect(scoreStatLine({ rushYd: 100, rushTD: 2 }, scoring)).toBeCloseTo(22);
  });

  it("applies negative coefficients", () => {
    expect(scoreStatLine({ passInt: 3 }, scoring)).toBe(-6);
  });

  it("ignores stats the league doesn't score", () => {
    expect(scoreStatLine({ rec: 50 }, scoring)).toBe(0); // no CC event above
  });
});

describe("projectedPoints", () => {
  it("prefers a flat override (kickers) over the statline", () => {
    const pk = { ...base, stats: { rushYd: 100 }, projPointsOverride: 70 };
    expect(projectedPoints(pk, scoring)).toBe(70);
  });

  it("scores the statline when no override", () => {
    const rb = { ...base, stats: { rushYd: 500, rushTD: 4 } };
    expect(projectedPoints(rb, scoring)).toBe(74);
  });
});

describe("pointsBreakdown", () => {
  it("sorts contributions by absolute points", () => {
    const r = { ...base, stats: { rushYd: 500, rushTD: 1, passInt: 10 } };
    const rows = pointsBreakdown(r, scoring);
    expect(rows.map((x) => x.key)).toEqual(["rushYd", "passInt", "rushTD"]);
    expect(rows[1].points).toBe(-20);
  });
});
