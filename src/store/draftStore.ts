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

  markDrafted: (id: string, franchiseId?: string) => void;
  undraft: (id: string) => void;
  undoLast: () => void;
  setMyTeam: (id: string | null) => void;
  setOverride: (id: string, stats: StatLine | null) => void;
  setWeights: (w: { modelWeight?: number; needWeight?: number }) => void;
  resetDraft: () => void;
  /** Restore a backup exported from Settings (replaces current state). */
  importState: (s: DraftBackup) => void;
}

export interface DraftBackup {
  draftedBy: Record<string, string>;
  pickOrder: string[];
  myFranchiseId: string | null;
  overrides: Record<string, StatLine>;
  modelWeight?: number;
  needWeight?: number;
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

      importState: (b) =>
        set((s) => ({
          draftedBy: b.draftedBy,
          pickOrder: b.pickOrder,
          myFranchiseId: b.myFranchiseId,
          overrides: b.overrides,
          modelWeight: b.modelWeight ?? s.modelWeight,
          needWeight: b.needWeight ?? s.needWeight,
        })),
    }),
    { name: "dd-draft-v1" },
  ),
);
