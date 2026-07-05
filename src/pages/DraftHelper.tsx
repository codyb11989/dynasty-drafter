import { useCallback, useMemo, useState } from "react";
import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { useBoardCtx } from "../context/BoardContext";
import { ALL_GROUPS, GROUP_LABEL } from "../lib/value";
import { displayName } from "../lib/format";
import { currentPickTracker } from "../lib/pickTracker";
import { sortRows, SORT_DEFAULT_DIR, type SortKey } from "../lib/tableSort";
import type { PosGroup } from "../types";
import RookieRow from "../components/RookieRow";
import SortableTh from "../components/SortableTh";
import SuggestPanel from "../components/SuggestPanel";
import NeedsPanel from "../components/NeedsPanel";

type Filter = "ALL" | PosGroup;

export default function DraftHelper() {
  const { league } = useAppData();
  const { board, available } = useBoardCtx();
  const pickOrder = useDraftStore((s) => s.pickOrder);
  const undoLast = useDraftStore((s) => s.undoLast);
  const draftedBy = useDraftStore((s) => s.draftedBy);
  const myFranchiseId = useDraftStore((s) => s.myFranchiseId);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [hideDrafted, setHideDrafted] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: SORT_DEFAULT_DIR[key] }));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = board.filter((r) => {
      if (hideDrafted && draftedBy[r.id]) return false;
      if (filter !== "ALL" && r.group !== filter) return false;
      if (q && !displayName(r.name).toLowerCase().includes(q) && !r.team.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(filtered, sort.key, sort.dir);
  }, [board, filter, query, hideDrafted, draftedBy, sort]);

  const lastPick = pickOrder[pickOrder.length - 1];
  const tracker = useMemo(
    () => currentPickTracker(pickOrder, league, myFranchiseId),
    [pickOrder, league, myFranchiseId],
  );

  return (
    <div>
      <div className="page-head row spread wrap" style={{ gap: 12 }}>
        <div>
          <h1>Draft Helper</h1>
          <p>
            {available.length} rookies available · {pickOrder.length} drafted. Tap{" "}
            <strong>Mine</strong> or pick a franchise as picks come in — the board and suggestion
            recalibrate instantly.
          </p>
        </div>
        <button className="btn" disabled={!lastPick} onClick={undoLast} title="Undo the last pick marked">
          ↶ Undo last
        </button>
      </div>

      <div className="card row spread wrap" style={{ marginBottom: 14, padding: "10px 16px" }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="tag gold">
            Round {tracker.round} · Pick {tracker.pickInRound}
          </span>
          <span className="faint" style={{ fontSize: 12 }}>#{tracker.overall} overall</span>
        </div>
        {myFranchiseId && tracker.picksUntilMine != null && (
          <span style={{ fontSize: 13 }} className={tracker.picksUntilMine === 0 ? "val" : "muted"}>
            {tracker.picksUntilMine === 0
              ? "You're on the clock!"
              : `${tracker.picksUntilMine} pick${tracker.picksUntilMine === 1 ? "" : "s"} until you're up`}
          </span>
        )}
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
                  <SortableTh label="#" sortKey="rank" active={sort.key === "rank"} dir={sort.dir} onClick={toggleSort} className="rank" />
                  <th>Player</th>
                  <SortableTh label="Proj" sortKey="proj" active={sort.key === "proj"} dir={sort.dir} onClick={toggleSort} className="num" />
                  <SortableTh label="VOR" sortKey="vor" active={sort.key === "vor"} dir={sort.dir} onClick={toggleSort} className="num hide-mobile" />
                  <SortableTh label="ADP" sortKey="adp" active={sort.key === "adp"} dir={sort.dir} onClick={toggleSort} className="num hide-mobile" />
                  <SortableTh label="Value" sortKey="value" active={sort.key === "value"} dir={sort.dir} onClick={toggleSort} />
                  <th className="num"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <RookieRow key={r.id} rookie={r} expanded={expandedId === r.id} onToggle={toggleExpanded} />
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
