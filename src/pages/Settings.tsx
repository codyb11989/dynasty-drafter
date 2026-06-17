import { useAppData } from "../App";
import { useDraftStore } from "../store/draftStore";
import { DEFAULT_SETTINGS } from "../lib/value";

export default function Settings() {
  const { league, meta } = useAppData();
  const { myFranchiseId, setMyTeam, modelWeight, needWeight, setWeights, resetDraft, draftedBy } =
    useDraftStore();
  const draftedCount = Object.keys(draftedBy).length;

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
            Higher = trust your scoring-based projections more (surfaces IDP value). Lower = lean on
            consensus rookie ADP (offense-only).
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
          <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
            Refresh league data anytime you have internet by running <code>npm run sync</code>, then
            reload. The app itself works fully offline during the draft.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Draft state</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            {draftedCount} player{draftedCount === 1 ? "" : "s"} currently marked as drafted. Your picks,
            edits, and settings are saved in this browser.
          </p>
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
      </div>
    </div>
  );
}
