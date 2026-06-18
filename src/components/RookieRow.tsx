import { useEffect, useState } from "react";
import { useAppData } from "../App";
import { useDraftStore, OTHER } from "../store/draftStore";
import { pointsBreakdown, GROUP_STATS, STAT_LABEL } from "../lib/scoring";
import { aiSearchUrl, displayName, fmtPick, franchiseName, playerSearchQuery } from "../lib/format";
import type { RankedRookie } from "../lib/value";
import type { Scoring, StatKey, StatLine } from "../types";
import PositionBadge from "./PositionBadge";

export default function RookieRow({
  rookie,
  expanded,
  onToggle,
}: {
  rookie: RankedRookie;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { league, scoring } = useAppData();
  const { draftedBy, myFranchiseId, markDrafted, undraft, overrides } = useDraftStore();
  const takenBy = draftedBy[rookie.id];
  const isMine = !!takenBy && takenBy === myFranchiseId;
  const isDrafted = !!takenBy;
  const rowClass = isMine ? "mine-row" : isDrafted ? "drafted-row" : "";

  return (
    <>
      <tr className={rowClass}>
        <td className="rank">{rookie.overallRank}</td>
        <td>
          <div className="row" style={{ gap: 9 }}>
            <PositionBadge group={rookie.group} pos={rookie.pos} />
            <div className="stack" style={{ gap: 1 }}>
              <span className="row" style={{ gap: 6 }}>
                <span className="pname" style={{ cursor: "pointer" }} onClick={onToggle}>
                  {displayName(rookie.name)}
                  {overrides[rookie.id] && <span className="tag gold" style={{ marginLeft: 6 }}>edited</span>}
                </span>
                <a
                  className="ai-link"
                  href={aiSearchUrl(playerSearchQuery(rookie))}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={`Quick AI search: ${displayName(rookie.name)}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  ✨
                </a>
              </span>
              <span className="pmeta">
                {rookie.team} · {fmtPick(rookie.draftRound, rookie.draftPick)}
                {rookie.college ? ` · ${rookie.college}` : ""} · {rookie.group}
                {rookie.posRank}
              </span>
            </div>
          </div>
        </td>
        <td className="num val">{rookie.proj.toFixed(0)}</td>
        <td className="num muted hide-mobile">
          {rookie.vor > 0 ? `+${rookie.vor.toFixed(0)}` : rookie.vor.toFixed(0)}
        </td>
        <td className="num muted hide-mobile">{rookie.adp != null ? rookie.adp.toFixed(1) : "—"}</td>
        <td className="num">
          {isDrafted ? (
            <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
              <span className="tag" title="drafted">
                {takenBy === OTHER ? "taken" : franchiseName(league, takenBy).split(" ")[0]}
              </span>
              <button className="btn ghost sm" onClick={() => undraft(rookie.id)}>
                undo
              </button>
            </div>
          ) : (
            <div className="row" style={{ gap: 5, justifyContent: "flex-end" }}>
              {myFranchiseId && (
                <button
                  className="btn primary sm"
                  title="Draft to my team"
                  onClick={() => markDrafted(rookie.id, myFranchiseId)}
                >
                  Mine
                </button>
              )}
              <button className="btn sm" title="Taken by another team" onClick={() => markDrafted(rookie.id)}>
                Taken
              </button>
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ background: "var(--bg)" }}>
            <RookieDetail rookie={rookie} scoring={scoring} />
          </td>
        </tr>
      )}
    </>
  );
}

function RookieDetail({ rookie, scoring }: { rookie: RankedRookie; scoring: Scoring }) {
  const { overrides, setOverride } = useDraftStore();
  const stats = (GROUP_STATS[rookie.group] ?? []) as StatKey[];
  const hasOverride = !!overrides[rookie.id];
  const breakdown = pointsBreakdown(rookie, scoring);

  // local buffer so users can type freely (decimals, partial input)
  const [draft, setDraft] = useState<Record<string, string>>(() => seed());
  function seed() {
    const s: Record<string, string> = {};
    for (const k of stats) s[k] = String(rookie.stats[k] ?? 0);
    return s;
  }
  useEffect(() => {
    setDraft(seed());
    // re-seed when switching players or after a reset clears the override
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rookie.id, hasOverride]);

  const commit = (k: StatKey, raw: string) => {
    const nextDraft = { ...draft, [k]: raw };
    setDraft(nextDraft);
    const next: StatLine = {};
    for (const sk of stats) {
      const num = parseFloat(nextDraft[sk]);
      if (!Number.isNaN(num)) next[sk] = num;
    }
    setOverride(rookie.id, next);
  };

  return (
    <div className="row wrap" style={{ alignItems: "flex-start", gap: 24, padding: "6px 4px 10px" }}>
      <div className="detail-breakdown">
        <div className="faint detail-h">How {rookie.proj.toFixed(0)} pts are scored</div>
        {breakdown.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Flat projection (no statline) — e.g. kicker.</div>
        ) : (
          breakdown.map((b) => (
            <div className="scoreline" key={b.key}>
              <span className="muted">
                {b.stat} {b.label} <span className="faint">× {b.coef}</span>
              </span>
              <span style={{ fontVariant: "tabular-nums" }}>
                {b.points >= 0 ? "+" : ""}
                {b.points.toFixed(1)}
              </span>
            </div>
          ))
        )}
      </div>

      {stats.length > 0 && (
        <div className="detail-stats">
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="faint detail-h" style={{ marginBottom: 0 }}>Tune projected stats</span>
            {hasOverride && (
              <button className="btn ghost sm" onClick={() => setOverride(rookie.id, null)}>
                reset to model
              </button>
            )}
          </div>
          <div className="statgrid">
            {stats.map((k) => (
              <div className="stat-cell" key={k}>
                <div className="k">{STAT_LABEL[k]}</div>
                <input
                  className="input"
                  style={{ width: "100%", padding: "4px 6px" }}
                  inputMode="decimal"
                  value={draft[k] ?? ""}
                  onChange={(e) => commit(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
