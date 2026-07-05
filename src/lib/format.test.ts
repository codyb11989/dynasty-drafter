import { describe, expect, it } from "vitest";
import { displayName, fmtPick, timeAgo } from "./format";

describe("displayName", () => {
  it('flips "Last, First" to "First Last"', () => {
    expect(displayName("Love, Jeremiyah")).toBe("Jeremiyah Love");
  });

  it("leaves natural names alone", () => {
    expect(displayName("Jeremiyah Love")).toBe("Jeremiyah Love");
  });

  it("handles suffixed last names", () => {
    expect(displayName("Bain Jr., Rueben")).toBe("Rueben Bain Jr.");
  });
});

describe("fmtPick", () => {
  it("formats round and pick", () => {
    expect(fmtPick(1, 5)).toBe("R1.05");
    expect(fmtPick(3, 38)).toBe("R3.38");
  });

  it("handles missing pick and UDFA", () => {
    expect(fmtPick(2, null)).toBe("R2");
    expect(fmtPick(null, null)).toBe("UDFA");
  });
});

describe("timeAgo", () => {
  it("buckets minutes, hours, days", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 10_000).toISOString())).toBe("just now");
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString())).toBe("5m ago");
    expect(timeAgo(new Date(now - 3 * 3_600_000).toISOString())).toBe("3h ago");
    expect(timeAgo(new Date(now - 48 * 3_600_000).toISOString())).toBe("2d ago");
  });
});
