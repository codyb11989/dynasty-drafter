import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { useBoard } from "../hooks/useBoard";
import { ALL_GROUPS, starterDemand } from "../lib/value";
import { displayName, franchiseName } from "../lib/format";
import PositionBadge from "./PositionBadge";

export default function NeedsPanel() {
  const { league } = useAppData();
  const { myFranchiseId, undraft } = useDraftStore();
  const { myCounts, myRookieIds, byId } = useBoard();
  const demand = starterDemand(league);

  if (!myFranchiseId) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 14 }}>My roster</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Choose your team in <strong>Settings</strong> to track roster needs as the draft unfolds.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 14 }}>My roster needs</h3>
        <span className="faint" style={{ fontSize: 12 }}>{franchiseName(league, myFranchiseId)}</span>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        {ALL_GROUPS.filter((g) => g !== "PK").map((g) => {
          const have = myCounts?.[g] ?? 0;
          const need = demand[g];
          const short = Math.max(0, need - have);
          return (
            <div className="row spread" key={g} style={{ fontSize: 13 }}>
              <div className="row" style={{ gap: 8 }}>
                <PositionBadge group={g} />
                <span className="muted">starts {need}</span>
              </div>
              <span className={short > 0 ? "" : "faint"} style={{ fontVariant: "tabular-nums" }}>
                {have} rostered{" "}
                {short > 0 ? <span style={{ color: "var(--accent)" }}>· need {short}</span> : "· set"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="faint" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
          My picks today ({myRookieIds.length})
        </div>
        {myRookieIds.length === 0 ? (
          <p className="faint" style={{ fontSize: 13, margin: "6px 0 0" }}>None yet.</p>
        ) : (
          <div className="stack" style={{ marginTop: 6, gap: 4 }}>
            {myRookieIds.map((id) => {
              const r = byId.get(id);
              if (!r) return null;
              return (
                <div className="row spread" key={id} style={{ fontSize: 13 }}>
                  <div className="row" style={{ gap: 7 }}>
                    <PositionBadge group={r.group} pos={r.pos} />
                    <span>{displayName(r.name)}</span>
                  </div>
                  <button className="btn ghost sm" onClick={() => undraft(id)} title="Undo this pick">
                    undo
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
