import { createContext, useContext, type ReactNode } from "react";
import { useBoard, type BoardResult } from "../hooks/useBoard";

const BoardCtx = createContext<BoardResult | null>(null);

/**
 * Computes the ranked rookie board once per data/store change and shares it via
 * context, so DraftHelper, SuggestPanel, NeedsPanel, and Players don't each run
 * their own copy of buildBoard() on every keystroke or pick.
 */
export function BoardProvider({ children }: { children: ReactNode }) {
  const board = useBoard();
  return <BoardCtx.Provider value={board}>{children}</BoardCtx.Provider>;
}

export function useBoardCtx(): BoardResult {
  const ctx = useContext(BoardCtx);
  if (!ctx) throw new Error("useBoardCtx must be used within a BoardProvider");
  return ctx;
}
