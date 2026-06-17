import { useMemo } from "react";
import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { ALL_GROUPS, GROUP_LABEL } from "../lib/value";
import { displayName } from "../lib/format";
import type { PosGroup } from "../types";
import PositionBadge from "../components/PositionBadge";

export default function Rosters() {
  const { league, rosters, players } = useAppData();
  const { myFranchiseId } = useDraftStore();

  const franchises = useMemo(() => {
    const list = [...league.franchises];
    list.sort((a, b) => {
      if (a.id === myFranchiseId) return -1;
      if (b.id === myFranchiseId) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [league.franchises, myFranchiseId]);

  return (
    <div>
      <div className="page-head">
        <h1>Rosters</h1>
        <p>
          Current dynasty rosters for all {league.franchiseCount} teams, pulled from MyFantasyLeague.
          Your team is highlighted and listed first.
        </p>
      </div>

      <div className="cols">
        {franchises.map((f) => {
          const ids = rosters[f.id] ?? [];
          const byGroup: Record<string, string[]> = {};
          for (const pid of ids) {
            const p = players[pid];
            if (!p?.group) continue;
            (byGroup[p.group] ??= []).push(displayName(p.name));
          }
          for (const g of Object.keys(byGroup)) byGroup[g].sort();
          const mine = f.id === myFranchiseId;
          return (
            <div className="card" key={f.id} style={mine ? { borderColor: "var(--accent-dim)" } : undefined}>
              <div className="row spread" style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 15 }}>
                  {f.name} {mine && <span className="tag gold">my team</span>}
                </h3>
                <span className="faint" style={{ fontSize: 12 }}>{ids.length} players</span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {ALL_GROUPS.map((g) => {
                  const names = byGroup[g] ?? [];
                  if (names.length === 0) return null;
                  return (
                    <div key={g}>
                      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                        <PositionBadge group={g as PosGroup} />
                        <span className="faint" style={{ fontSize: 11 }}>
                          {GROUP_LABEL[g as PosGroup]} · {names.length}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {names.join(" · ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
