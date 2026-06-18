import { useMemo, useState } from "react";
import { useDraftStore } from "../store/draftStore";
import { useBoard } from "../hooks/useBoard";
import { ALL_GROUPS, GROUP_LABEL } from "../lib/value";
import { displayName } from "../lib/format";
import type { PosGroup } from "../types";
import RookieRow from "../components/RookieRow";

type Filter = "ALL" | PosGroup;
type Sort = "value" | "proj" | "vor" | "adp";

export default function Players() {
  const { board } = useBoard();
  const { draftedBy } = useDraftStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("value");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = board.filter((r) => {
      if (hideDrafted && draftedBy[r.id]) return false;
      if (filter !== "ALL" && r.group !== filter) return false;
      if (q && !displayName(r.name).toLowerCase().includes(q) && !r.team.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sort === "adp" ? 1 : -1; // adp: lower is better
    return [...filtered].sort((a, b) => {
      const av = sort === "adp" ? (a.adp ?? 9999) : (a[sort] as number);
      const bv = sort === "adp" ? (b.adp ?? 9999) : (b[sort] as number);
      return (av - bv) * dir;
    });
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
            sort
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="value">Value</option>
              <option value="proj">Proj pts</option>
              <option value="vor">VOR</option>
              <option value="adp">ADP</option>
            </select>
          </label>
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
                <th className="num">VOR</th>
                <th className="num">ADP</th>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
