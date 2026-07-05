import { useState } from "react";
import { useAppData, useSync } from "../App";
import { useDraftStore, type DraftBackup } from "../store/draftStore";
import { DEFAULT_SETTINGS } from "../lib/value";

export default function Settings() {
  const { league, meta } = useAppData();
  const { refresh, status, error: syncError } = useSync();
  const {
    myFranchiseId,
    setMyTeam,
    modelWeight,
    needWeight,
    setWeights,
    resetDraft,
    draftedBy,
    pickOrder,
    overrides,
    importState,
  } = useDraftStore();
  const draftedCount = Object.keys(draftedBy).length;

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const exportBackup = async () => {
    const payload = JSON.stringify({
      app: "dynasty-drafter",
      v: 1,
      savedAt: new Date().toISOString(),
      draftedBy,
      pickOrder,
      myFranchiseId,
      overrides,
      modelWeight,
      needWeight,
    });
    try {
      await navigator.clipboard.writeText(payload);
      setBackupMsg("Backup copied to clipboard ✓ — paste it somewhere safe (notes, chat).");
    } catch {
      // Clipboard can be unavailable (permissions, http) — download instead.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
      a.download = `draft-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setBackupMsg("Backup downloaded ✓");
    }
  };

  const applyImport = () => {
    try {
      const d = JSON.parse(importText);
      if (!d || typeof d !== "object" || typeof d.draftedBy !== "object" || d.draftedBy == null) {
        throw new Error("that doesn't look like a draft backup");
      }
      const backup: DraftBackup = {
        draftedBy: d.draftedBy,
        pickOrder: Array.isArray(d.pickOrder) ? d.pickOrder : Object.keys(d.draftedBy),
        myFranchiseId: typeof d.myFranchiseId === "string" ? d.myFranchiseId : null,
        overrides: d.overrides && typeof d.overrides === "object" ? d.overrides : {},
        modelWeight: typeof d.modelWeight === "number" ? d.modelWeight : undefined,
        needWeight: typeof d.needWeight === "number" ? d.needWeight : undefined,
      };
      importState(backup);
      setShowImport(false);
      setImportText("");
      setBackupMsg(`Restored ${Object.keys(backup.draftedBy).length} drafted players ✓`);
    } catch (e) {
      setBackupMsg(`Restore failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const syncing = status === "syncing";
  const syncMsg =
    status === "updated"
      ? "Pulled fresh data ✓"
      : status === "current"
      ? "Already up to date ✓"
      : status === "error"
      ? syncError ?? "Sync failed."
      : null;

  return (
    <div>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Pick your team, tune the suggestion engine, and manage draft-day data.</p>
      </div>

      <div className="cols">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>My team</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Used to weight "Suggest my next pick" by your roster needs and to mark your own picks.
          </p>
          <select
            className="select"
            style={{ width: "100%" }}
            value={myFranchiseId ?? ""}
            onChange={(e) => setMyTeam(e.target.value || null)}
          >
            <option value="">— Select your franchise —</option>
            {league.franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Suggestion engine</h3>

          <div className="row spread" style={{ fontSize: 13 }}>
            <span>Model vs. market (ADP)</span>
            <span className="faint">
              {Math.round(modelWeight * 100)}% model / {Math.round((1 - modelWeight) * 100)}% ADP
            </span>
          </div>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={modelWeight}
            onChange={(e) => setWeights({ modelWeight: Number(e.target.value) })}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 2 }}>
            Higher = trust your scoring-based projections more. Lower = lean on market consensus
            (rookie-draft ADP incl. IDP, plus FantasyCalc for offense).
          </p>

          <div className="row spread" style={{ fontSize: 13, marginTop: 12 }}>
            <span>Roster-need weighting</span>
            <span className="faint">{Math.round(needWeight * 100)}%</span>
          </div>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={needWeight}
            onChange={(e) => setWeights({ needWeight: Number(e.target.value) })}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 2 }}>
            How much the suggestion tilts toward positions you still need to fill vs. best player available.
          </p>

          <button
            className="btn sm"
            style={{ marginTop: 8 }}
            onClick={() => setWeights({ modelWeight: DEFAULT_SETTINGS.modelWeight, needWeight: DEFAULT_SETTINGS.needWeight })}
          >
            Reset to defaults
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Data</h3>
          <dl className="kv">
            <dt>League</dt>
            <dd>{league.name}</dd>
            <dt>League ID</dt>
            <dd>{league.id}</dd>
            <dt>Season</dt>
            <dd>{meta.year}</dd>
            <dt>Rookies</dt>
            <dd>{meta.rookieCount}</dd>
            <dt>Last synced</dt>
            <dd>{new Date(meta.syncedAt).toLocaleString()}</dd>
          </dl>
          <div className="row" style={{ gap: 10, alignItems: "center", marginTop: 12 }}>
            <button className="btn sm" onClick={refresh} disabled={syncing}>
              {syncing ? "Syncing…" : "↻ Sync now"}
            </button>
            {syncMsg && (
              <span className="faint" style={{ fontSize: 12, color: status === "error" ? "#ff9b95" : undefined }}>
                {syncMsg}
              </span>
            )}
          </div>
          <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
            <strong>Sync now</strong> re-pulls the latest league data from the network (whenever you're
            online) without reloading. The newest stats land here after <code>npm run sync</code> is run
            and deployed — the app itself works fully offline during the draft.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Draft state</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            {draftedCount} player{draftedCount === 1 ? "" : "s"} currently marked as drafted. Your picks,
            edits, and settings are saved in this browser — back them up if you might switch devices
            mid-draft.
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn sm" onClick={exportBackup}>
              ⇪ Back up
            </button>
            <button className="btn sm" onClick={() => setShowImport((v) => !v)}>
              ⇩ Restore
            </button>
            <button
              className="btn danger sm"
              onClick={() => {
                if (confirm("Clear all drafted players and start the draft over? (Keeps your team & tuning.)"))
                  resetDraft();
              }}
            >
              Reset draft board
            </button>
          </div>
          {showImport && (
            <div className="stack" style={{ gap: 8, marginTop: 10 }}>
              <textarea
                className="input"
                rows={4}
                placeholder="Paste a backup here…"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
              />
              <button className="btn primary sm" onClick={applyImport} disabled={!importText.trim()}>
                Restore backup
              </button>
            </div>
          )}
          {backupMsg && (
            <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              {backupMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
