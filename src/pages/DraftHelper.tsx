import { useMemo, useState } from "react";
import { useDraftStore } from "../store/draftStore";
import { useBoard } from "../hooks/useBoard";
import { ALL_GROUPS, GROUP_LABEL } from "../lib/value";
import { displayName } from "../lib/format";
import type { PosGroup } from "../types";
import RookieRow from "../components/RookieRow";
import SuggestPanel from "../components/SuggestPanel";
import NeedsPanel from "../components/NeedsPanel";

type Filter = "ALL" | PosGroup;

export default function DraftHelper() {
  const { board, available } = useBoard();
  const { pickOrder, undoLast, draftedBy } = useDraftStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [hideDrafted, setHideDrafted] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.filter((r) => {
      if (hideDrafted && draftedBy[r.id]) return false;
      if (filter !== "ALL" && r.group !== filter) return false;
      if (q && !displayName(r.name).toLowerCase().includes(q) && !r.team.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [board, filter, query, hideDrafted, draftedBy]);

  const lastPick = pickOrder[pickOrder.length - 1];

  return (
    <div>
      <div className="page-head row spread wrap" style={{ gap: 12 }}>
        <div>
          <h1>Draft Helper</h1>
          <p>
            {available.length} rookies available · {pickOrder.length} drafted. Tap{" "}
            <strong>Mine</strong> or <strong>Taken</strong> as picks come in — the board and suggestion
            recalibrate instantly.
          </p>
        </div>
        <button className="btn" disabled={!lastPick} onClick={undoLast} title="Undo the last pick marked">
          ↶ Undo last
        </button>
      </div>

      <div className="draft-grid">
        <div className="card" style={{ padding: 0 }}>
          <div className="toolbar" style={{ padding: "12px 14px 0" }}>
            <input
              className="input search"
              placeholder="Search player or team…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="row faint" style={{ fontSize: 13, gap: 6 }}>
              <input type="checkbox" checked={hideDrafted} onChange={(e) => setHideDrafted(e.target.checked)} />
              hide drafted
            </label>
          </div>
          <div className="toolbar" style={{ padding: "8px 14px 4px" }}>
            <div className="seg">
              <button className={filter === "ALL" ? "on" : ""} onClick={() => setFilter("ALL")}>
                ALL
              </button>
              {ALL_GROUPS.map((g) => (
                <button key={g} className={filter === g ? "on" : ""} onClick={() => setFilter(g)}>
                  {GROUP_LABEL[g]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th>Player</th>
                  <th className="num">Proj</th>
                  <th className="num hide-mobile">VOR</th>
                  <th className="num hide-mobile">ADP</th>
                  <th className="num"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <RookieRow
                    key={r.id}
                    rookie={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 30 }}>
                      No players match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sticky-side">
          <SuggestPanel onPick={() => setExpandedId(null)} />
          <NeedsPanel />
        </aside>
      </div>
    </div>
  );
}
