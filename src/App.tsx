import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { loadAllData, type AppData } from "./lib/data";
import { timeAgo } from "./lib/format";
import DraftHelper from "./pages/DraftHelper";
import Rosters from "./pages/Rosters";
import RulesScoring from "./pages/RulesScoring";
import Players from "./pages/Players";
import Settings from "./pages/Settings";

const DataCtx = createContext<AppData | null>(null);
export const useAppData = () => {
  const d = useContext(DataCtx);
  if (!d) throw new Error("useAppData must be used within a loaded DataProvider");
  return d;
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData().then(setData).catch((e) => setError(String(e)));
  }, []);

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
            <span className="sync-pill" title={new Date(data.meta.syncedAt).toLocaleString()}>
              synced {timeAgo(data.meta.syncedAt)}
            </span>
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
    </DataCtx.Provider>
  );
}
