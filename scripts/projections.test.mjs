import { describe, expect, it } from "vitest";
import { capitalTier, projectRookie } from "./projections.mjs";

describe("capitalTier", () => {
  it("splits round 1 at pick 12", () => {
    expect(capitalTier(1, 1)).toBe(0);
    expect(capitalTier(1, 12)).toBe(0);
    expect(capitalTier(1, 13)).toBe(1);
    expect(capitalTier(1, 32)).toBe(1);
  });

  it("keys rounds 2-3 directly, unaffected by compensatory-pick inflation", () => {
    expect(capitalTier(2, 33)).toBe(2);
    // A late round-3 comp pick (e.g. R3.43) must stay tier 3, not spill to day 3.
    expect(capitalTier(3, 43)).toBe(3);
  });

  it("groups day 3 and UDFA", () => {
    expect(capitalTier(4, 1)).toBe(4);
    expect(capitalTier(7, 30)).toBe(4);
    expect(capitalTier(null, null)).toBe(5);
    expect(capitalTier(0, 0)).toBe(5);
  });
});

describe("projectRookie", () => {
  it("gives kickers a flat points override instead of a statline", () => {
    const pk = projectRookie({ position: "PK", draft_round: 5, draft_pick: 10 });
    expect(pk.projPointsOverride).toBeGreaterThan(0);
    expect(pk.stats).toEqual({});
  });

  it("projects more for better draft capital within a group", () => {
    const early = projectRookie({ position: "LB", draft_round: 1, draft_pick: 5 });
    const late = projectRookie({ position: "LB", draft_round: 6, draft_pick: 10 });
    expect(early.stats.tackleSolo).toBeGreaterThan(late.stats.tackleSolo);
  });

  it("discounts interior DL relative to edge at equal capital", () => {
    const edge = projectRookie({ position: "DE", draft_round: 1, draft_pick: 5 });
    const interior = projectRookie({ position: "DT", draft_round: 1, draft_pick: 5 });
    expect(interior.stats.sack).toBeLessThan(edge.stats.sack);
    expect(edge.group).toBe("DL");
    expect(interior.group).toBe("DL");
  });

  it("nudges earlier picks above later ones inside the same tier", () => {
    const p1 = projectRookie({ position: "WR", draft_round: 2, draft_pick: 1 });
    const p2 = projectRookie({ position: "WR", draft_round: 2, draft_pick: 32 });
    expect(p1.stats.recYd).toBeGreaterThan(p2.stats.recYd);
  });
});
