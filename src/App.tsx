import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { loadAllData, type AppData } from "./lib/data";
import { timeAgo } from "./lib/format";
import { useDraftStore } from "./store/draftStore";
import { BoardProvider } from "./context/BoardContext";
import DraftHelper from "./pages/DraftHelper";
import Rosters from "./pages/Rosters";
import RulesScoring from "./pages/RulesScoring";
import Players from "./pages/Players";
import Settings from "./pages/Settings";

/**
 * Drop stale drafted/override entries left over from a previous rookie pool, and
 * prompt to reset the board if this looks like a new season (meta.year changed).
 */
function reconcileWithFreshData(next: AppData) {
  const store = useDraftStore.getState();
  const validIds = new Set(next.rookies.map((r) => r.id));
  store.reconcile(validIds);

  if (store.lastSeenYear && store.lastSeenYear !== next.meta.year) {
    const startFresh = window.confirm(
      `New season detected (${store.lastSeenYear} → ${next.meta.year}). Reset your draft board for the new season? (Your team pick and tuning are kept either way.)`,
    );
    if (startFresh) store.resetDraft();
  }
  store.setLastSeenYear(next.meta.year);
}

const DataCtx = createContext<AppData | null>(null);
export const useAppData = () => {
  const d = useContext(DataCtx);
  if (!d) throw new Error("useAppData must be used within a loaded DataProvider");
  return d;
};

export type SyncStatus = "idle" | "syncing" | "updated" | "current" | "error";

export interface SyncControl {
  /** Re-fetch league data fresh from the network (manual sync). */
  refresh: () => void;
  status: SyncStatus;
  error: string | null;
}

const SyncCtx = createContext<SyncControl | null>(null);
export const useSync = () => {
  const s = useContext(SyncCtx);
  if (!s) throw new Error("useSync must be used within App");
  return s;
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  const inFlight = useRef(false);
  const syncedAtRef = useRef<string | null>(null);

  useEffect(() => {
    loadAllData()
      .then((next) => {
        reconcileWithFreshData(next);
        setData(next);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Track the loaded data's sync time so a manual refresh can tell "updated" from
  // "already current" without reading state inside a (StrictMode-doubled) updater.
  useEffect(() => {
    syncedAtRef.current = data?.meta.syncedAt ?? null;
  }, [data]);

  const refresh = useCallback(() => {
    if (inFlight.current) return; // ignore re-clicks while a sync is running
    inFlight.current = true;
    clearTimeout(resetTimer.current);
    setSyncError(null);
    setStatus("syncing");
    loadAllData({ bust: true })
      .then((next) => {
        const changed = syncedAtRef.current !== next.meta.syncedAt;
        reconcileWithFreshData(next);
        setData(next);
        setStatus(changed ? "updated" : "current");
        resetTimer.current = setTimeout(() => setStatus("idle"), 3000);
      })
      .catch((e) => {
        setSyncError(String(e));
        setStatus("error");
        resetTimer.current = setTimeout(() => setStatus("idle"), 5000);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  if (error) {
    return (
      <div className="error-box">
        <div>
          <h2>Couldn't load league data</h2>
          <p className="muted">{error}</p>
          <p className="faint">
            Run <code>npm run sync</code> to generate <code>public/data/</code>, then reload.
          </p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="loading">
        <div>
          <div className="spinner" />
          Loading league data…
        </div>
      </div>
    );
  }

  return (
    <DataCtx.Provider value={data}>
      <SyncCtx.Provider value={{ refresh, status, error: syncError }}>
        <BoardProvider>
        <div className="app">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="brand">
                <span className="logo">🐃</span>
                <span>
                  Water Buffaloes
                  <small>{data.league.name}</small>
                </span>
              </div>
              <nav className="nav">
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                  Draft Helper
                </NavLink>
                <NavLink to="/players" className={({ isActive }) => (isActive ? "active" : "")}>
                  Rookie Board
                </NavLink>
                <NavLink to="/rosters" className={({ isActive }) => (isActive ? "active" : "")}>
                  Rosters
                </NavLink>
                <NavLink to="/rules" className={({ isActive }) => (isActive ? "active" : "")}>
                  Rules & Scoring
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
                  Settings
                </NavLink>
              </nav>
              <div className="topbar-spacer" />
              <SyncPill syncedAt={data.meta.syncedAt} status={status} error={syncError} onSync={refresh} />
            </div>
          </header>
          <main className="content">
            <Routes>
              <Route path="/" element={<DraftHelper />} />
              <Route path="/players" element={<Players />} />
              <Route path="/rosters" element={<Rosters />} />
              <Route path="/rules" element={<RulesScoring />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
        </BoardProvider>
      </SyncCtx.Provider>
    </DataCtx.Provider>
  );
}

function SyncPill({
  syncedAt,
  status,
  error,
  onSync,
}: {
  syncedAt: string;
  status: SyncStatus;
  error: string | null;
  onSync: () => void;
}) {
  const label =
    status === "syncing"
      ? "syncing…"
      : status === "updated"
      ? "updated ✓"
      : status === "current"
      ? "up to date ✓"
      : status === "error"
      ? "sync failed"
      : `synced ${timeAgo(syncedAt)}`;
  const title =
    status === "error" && error
      ? error
      : `Data synced ${new Date(syncedAt).toLocaleString()} · click to check for updates`;

  return (
    <button
      className={`sync-pill${status === "error" ? " err" : ""}`}
      onClick={onSync}
      disabled={status === "syncing"}
      title={title}
    >
      <span className={`sync-ico${status === "syncing" ? " spin" : ""}`} aria-hidden>
        ↻
      </span>
      {label}
    </button>
  );
}
