import { useMemo } from "react";
import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { buildBoard, rosterCountByGroup, rosterStrengthByGroup, type RankedRookie } from "../lib/value";
import { ALL_GROUPS } from "../lib/value";
import type { PosGroup, Rookie } from "../types";

export interface BoardResult {
  board: RankedRookie[];
  byId: Map<string, RankedRookie>;
  available: RankedRookie[];
  availableIds: Set<string>;
  /** my full roster counts by group: existing dynasty roster + rookies I drafted today */
  myCounts: Record<PosGroup, number> | null;
  /** quality strength per group (0..∞, 1.0 = at replacement); null for IDP/PK or no FC data */
  myStrength: Partial<Record<PosGroup, number>> | null;
  myRookieIds: string[];
}

export function useBoard(): BoardResult {
  const { rookies, scoring, league, rosters, players, playerValues } = useAppData();
  const { draftedBy, myFranchiseId, overrides, modelWeight, needWeight } = useDraftStore();

  return useMemo(() => {
    // Apply manual stat overrides before scoring.
    const tuned: Rookie[] = rookies.map((r) =>
      overrides[r.id] ? { ...r, stats: { ...r.stats, ...overrides[r.id] }, projPointsOverride: null } : r,
    );

    const board = buildBoard(tuned, scoring, league, { modelWeight, needWeight });
    const byId = new Map(board.map((r) => [r.id, r]));

    const availableIds = new Set<string>();
    for (const r of board) if (!draftedBy[r.id]) availableIds.add(r.id);
    const available = board.filter((r) => availableIds.has(r.id));

    const myRookieIds = Object.keys(draftedBy).filter((id) => draftedBy[id] === myFranchiseId);

    let myCounts: Record<PosGroup, number> | null = null;
    let myStrength: Partial<Record<PosGroup, number>> | null = null;
    if (myFranchiseId) {
      myCounts = rosterCountByGroup(myFranchiseId, rosters, players);
      for (const id of myRookieIds) {
        const g = byId.get(id)?.group;
        if (g) myCounts[g] += 1;
      }
      myStrength = rosterStrengthByGroup(myFranchiseId, rosters, playerValues, league);
    }

    return { board, byId, available, availableIds, myCounts, myStrength, myRookieIds };
  }, [rookies, scoring, league, rosters, players, playerValues, draftedBy, myFranchiseId, overrides, modelWeight, needWeight]);
}

export { ALL_GROUPS };
