import { useCallback, useMemo, useState } from "react";
import { useDraftStore } from "../store/draftStore";
import { useBoardCtx } from "../context/BoardContext";
import { ALL_GROUPS, GROUP_LABEL } from "../lib/value";
import { displayName } from "../lib/format";
import { sortRows, SORT_DEFAULT_DIR, type SortKey } from "../lib/tableSort";
import type { PosGroup } from "../types";
import RookieRow from "../components/RookieRow";
import SortableTh from "../components/SortableTh";

type Filter = "ALL" | PosGroup;

export default function Players() {
  const { board } = useBoardCtx();
  const draftedBy = useDraftStore((s) => s.draftedBy);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const [hideDrafted, setHideDrafted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  }, [board, filter, query, sort, hideDrafted, draftedBy]);

  return (
    <div>
      <div className="page-head">
        <h1>Rookie Board</h1>
        <p>
          All {board.length} rookies ranked by your league's scoring. Click a name to see the scoring
          breakdown and hand-tune projections. Mark picks here or on the Draft Helper — they stay in sync.
        </p>
      </div>

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
                <SortableTh label="VOR" sortKey="vor" active={sort.key === "vor"} dir={sort.dir} onClick={toggleSort} className="num" />
                <SortableTh label="ADP" sortKey="adp" active={sort.key === "adp"} dir={sort.dir} onClick={toggleSort} className="num" />
                <SortableTh label="Value" sortKey="value" active={sort.key === "value"} dir={sort.dir} onClick={toggleSort} />
                <th className="num"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <RookieRow key={r.id} rookie={r} expanded={expandedId === r.id} onToggle={toggleExpanded} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
