import type { League } from "../types";

export interface PickTracker {
  overall: number;
  round: number;
  pickInRound: number;
  /** picks remaining until myFranchiseId is next up, or null if unknown/not set. */
  picksUntilMine: number | null;
}

/**
 * Straight (non-snake) round-robin pick tracker for the pick that's coming up next.
 * There's no synced MFL "draft order" endpoint, so — matching the same assumption
 * exportDraft's round math already relies on — this treats league.franchises' sorted
 * order as the draft slot order to estimate "picks until mine".
 */
export function currentPickTracker(
  pickOrder: string[],
  league: League,
  myFranchiseId: string | null,
): PickTracker {
  const teams = league.franchiseCount || league.franchises.length || 1;
  const overall = pickOrder.length + 1;
  const round = Math.ceil(overall / teams);
  const pickInRound = ((overall - 1) % teams) + 1;

  let picksUntilMine: number | null = null;
  if (myFranchiseId) {
    const slot = league.franchises.findIndex((f) => f.id === myFranchiseId);
    if (slot !== -1) {
      const mySlotInRound = slot + 1;
      picksUntilMine =
        mySlotInRound >= pickInRound ? mySlotInRound - pickInRound : teams - pickInRound + mySlotInRound;
    }
  }

  return { overall, round, pickInRound, picksUntilMine };
}
