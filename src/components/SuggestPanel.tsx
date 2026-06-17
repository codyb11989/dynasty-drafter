import { useMemo } from "react";
import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { useBoard } from "../hooks/useBoard";
import { suggestPicks } from "../lib/value";
import { displayName, fmtPick } from "../lib/format";
import PositionBadge from "./PositionBadge";

export default function SuggestPanel({ onPick }: { onPick?: (id: string) => void }) {
  const { league } = useAppData();
  const { myFranchiseId, modelWeight, needWeight, markDrafted } = useDraftStore();
  const { board, availableIds, myCounts } = useBoard();

  const suggestions = useMemo(
    () => suggestPicks(board, availableIds, league, myCounts, { modelWeight, needWeight }, 5),
    [board, availableIds, league, myCounts, modelWeight, needWeight],
  );

  if (suggestions.length === 0) {
    return (
      <div className="card suggest">
        <h3>Suggest my next pick</h3>
        <p className="muted" style={{ marginBottom: 0 }}>
          No available rookies left on the board.
        </p>
      </div>
    );
  }

  const top = suggestions[0].rookie;
  const draftMine = (id: string) => {
    if (myFranchiseId) markDrafted(id, myFranchiseId);
    onPick?.(id);
  };

  return (
    <div className="card suggest">
      <h3>Suggest my next pick</h3>
      {!myFranchiseId && (
        <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
          Pick your team in <strong>Settings</strong> to weight suggestions by your roster needs.
        </p>
      )}

      <div className="suggest-top">
        <div className="row spread">
          <div className="row">
            <PositionBadge group={top.group} pos={top.pos} />
            <span className="big">{displayName(top.name)}</span>
          </div>
          <span className="val" style={{ fontSize: 18 }}>
            {top.proj.toFixed(0)}
            <span className="faint" style={{ fontSize: 11, fontWeight: 500 }}> pts</span>
          </span>
        </div>
        <div className="reasons">{suggestions[0].reasons.join(" · ")}</div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary sm" onClick={() => draftMine(top.id)} disabled={!myFranchiseId}>
            ✓ Draft to my team
          </button>
          <button className="btn sm" onClick={() => markDrafted(top.id)}>
            Taken by other
          </button>
        </div>
      </div>

      <div>
        {suggestions.slice(1).map((s) => (
          <div className="sug-item" key={s.rookie.id}>
            <div>
              <div className="row" style={{ gap: 7 }}>
                <PositionBadge group={s.rookie.group} pos={s.rookie.pos} />
                <strong>{displayName(s.rookie.name)}</strong>
                <span className="faint">{fmtPick(s.rookie.draftRound, s.rookie.draftPick)}</span>
              </div>
              <div className="reasons">{s.reasons.slice(0, 2).join(" · ")}</div>
            </div>
            <div className="row" style={{ gap: 5 }}>
              <span className="muted" style={{ fontVariant: "tabular-nums" }}>
                {s.rookie.proj.toFixed(0)}
              </span>
              <button
                className="btn ghost sm"
                title="Draft to my team"
                onClick={() => draftMine(s.rookie.id)}
                disabled={!myFranchiseId}
              >
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
        Weighted by value{myFranchiseId ? " + your roster needs" : ""}. Tune in Settings.
      </div>
    </div>
  );
}
