import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StatLine } from "../types";

export const OTHER = "OTHER"; // a rookie taken by someone other than me

interface DraftState {
  /** rookieId -> franchiseId that drafted them (or OTHER). Absent = available. */
  draftedBy: Record<string, string>;
  /** order rookies were marked, for the activity feed / undo-last. */
  pickOrder: string[];
  /** my franchise id (set once, in Settings / team picker). */
  myFranchiseId: string | null;
  /** per-rookie manual stat overrides (hand-tuning projections). */
  overrides: Record<string, StatLine>;
  /** value-engine knobs. */
  modelWeight: number;
  needWeight: number;
  /** the meta.year of the last data sync we reconciled against, to detect a new season. */
  lastSeenYear: string | null;

  markDrafted: (id: string, franchiseId?: string) => void;
  undraft: (id: string) => void;
  undoLast: () => void;
  setMyTeam: (id: string | null) => void;
  setOverride: (id: string, stats: StatLine | null) => void;
  setWeights: (w: { modelWeight?: number; needWeight?: number }) => void;
  resetDraft: () => void;
  /** drop draftedBy/pickOrder/overrides entries whose player id is no longer in the synced rookie pool. */
  reconcile: (validIds: Set<string>) => void;
  setLastSeenYear: (year: string) => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draftedBy: {},
      pickOrder: [],
      myFranchiseId: null,
      overrides: {},
      modelWeight: 0.5,
      needWeight: 0.35,
      lastSeenYear: null,

      markDrafted: (id, franchiseId = OTHER) =>
        set((s) => ({
          draftedBy: { ...s.draftedBy, [id]: franchiseId },
          pickOrder: s.pickOrder.includes(id) ? s.pickOrder : [...s.pickOrder, id],
        })),

      undraft: (id) =>
        set((s) => {
          const draftedBy = { ...s.draftedBy };
          delete draftedBy[id];
          return { draftedBy, pickOrder: s.pickOrder.filter((p) => p !== id) };
        }),

      undoLast: () =>
        set((s) => {
          if (s.pickOrder.length === 0) return s;
          const last = s.pickOrder[s.pickOrder.length - 1];
          const draftedBy = { ...s.draftedBy };
          delete draftedBy[last];
          return { draftedBy, pickOrder: s.pickOrder.slice(0, -1) };
        }),

      setMyTeam: (id) => set({ myFranchiseId: id }),

      setOverride: (id, stats) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (stats == null) delete overrides[id];
          else overrides[id] = stats;
          return { overrides };
        }),

      setWeights: (w) =>
        set((s) => ({
          modelWeight: w.modelWeight ?? s.modelWeight,
          needWeight: w.needWeight ?? s.needWeight,
        })),

      resetDraft: () => set({ draftedBy: {}, pickOrder: [] }),

      reconcile: (validIds) =>
        set((s) => {
          let changed = false;

          const draftedBy: Record<string, string> = {};
          for (const [id, franchiseId] of Object.entries(s.draftedBy)) {
            if (validIds.has(id)) draftedBy[id] = franchiseId;
            else changed = true;
          }

          const pickOrder = s.pickOrder.filter((id) => validIds.has(id));
          if (pickOrder.length !== s.pickOrder.length) changed = true;

          const overrides: Record<string, StatLine> = {};
          for (const [id, stats] of Object.entries(s.overrides)) {
            if (validIds.has(id)) overrides[id] = stats;
            else changed = true;
          }

          return changed ? { draftedBy, pickOrder, overrides } : s;
        }),

      setLastSeenYear: (year) => set({ lastSeenYear: year }),
    }),
    {
      name: "dd-draft-v1",
      version: 1,
      // No schema changes yet — persisted state is merged onto the initial state above,
      // so fields added since v0 (e.g. lastSeenYear) pick up their defaults automatically.
      migrate: (persisted) => persisted as DraftState,
    },
  ),
);
