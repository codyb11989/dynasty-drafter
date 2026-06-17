import { useAppData } from "../App";
import type { ScoringEvent } from "../types";

interface EventMeta {
  label: string;
  unit: string;
  cat: "Passing" | "Rushing" | "Receiving" | "Kicking" | "Returns & Misc" | "IDP / Defense";
}

const EVENT_META: Record<string, EventMeta> = {
  "#P": { label: "Passing TD", unit: "TD", cat: "Passing" },
  PY: { label: "Passing Yards", unit: "yd", cat: "Passing" },
  IN: { label: "Interception Thrown", unit: "INT", cat: "Passing" },
  P2: { label: "2-pt Pass", unit: "conv", cat: "Passing" },
  "#R": { label: "Rushing TD", unit: "TD", cat: "Rushing" },
  RY: { label: "Rushing Yards", unit: "yd", cat: "Rushing" },
  R2: { label: "2-pt Rush", unit: "conv", cat: "Rushing" },
  "#C": { label: "Receiving TD", unit: "TD", cat: "Receiving" },
  CY: { label: "Receiving Yards", unit: "yd", cat: "Receiving" },
  CC: { label: "Reception", unit: "rec", cat: "Receiving" },
  C2: { label: "2-pt Reception", unit: "conv", cat: "Receiving" },
  FG: { label: "Field Goal", unit: "yd", cat: "Kicking" },
  MG: { label: "Missed Field Goal", unit: "yd", cat: "Kicking" },
  EP: { label: "Extra Point", unit: "XP", cat: "Kicking" },
  EM: { label: "Missed Extra Point", unit: "XP", cat: "Kicking" },
  UY: { label: "Punt Return Yards", unit: "yd", cat: "Returns & Misc" },
  KY: { label: "Kick Return Yards", unit: "yd", cat: "Returns & Misc" },
  FL: { label: "Fumble Lost", unit: "fum", cat: "Returns & Misc" },
  FC: { label: "Fumble Recovered", unit: "rec", cat: "Returns & Misc" },
  "#FR": { label: "Fumble Return TD", unit: "TD", cat: "Returns & Misc" },
  IC: { label: "INT Return TD", unit: "TD", cat: "Returns & Misc" },
  BLF: { label: "Blocked FG", unit: "blk", cat: "Returns & Misc" },
  BLP: { label: "Blocked Punt", unit: "blk", cat: "Returns & Misc" },
  BLE: { label: "Blocked XP", unit: "blk", cat: "Returns & Misc" },
  TK: { label: "Solo Tackle", unit: "tackle", cat: "IDP / Defense" },
  AS: { label: "Assisted Tackle", unit: "tackle", cat: "IDP / Defense" },
  SK: { label: "Sack", unit: "sack", cat: "IDP / Defense" },
  TKL: { label: "Tackle For Loss", unit: "TFL", cat: "IDP / Defense" },
  FF: { label: "Forced Fumble", unit: "FF", cat: "IDP / Defense" },
  PD: { label: "Pass Defended", unit: "PD", cat: "IDP / Defense" },
  SF: { label: "Safety", unit: "safety", cat: "IDP / Defense" },
  "#T": { label: "Defensive/Return TD", unit: "TD", cat: "IDP / Defense" },
};

const CATS: EventMeta["cat"][] = [
  "Passing",
  "Rushing",
  "Receiving",
  "Kicking",
  "IDP / Defense",
  "Returns & Misc",
];

function fmtCoef(code: string, ev: ScoringEvent): string {
  const sign = ev.coef > 0 ? "+" : "";
  if (code === "FG" || code === "MG") return `${sign}${ev.coef} / yd`;
  return `${sign}${ev.coef}`;
}

const SLOT_LABEL: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  WR: "Wide Receiver",
  TE: "Tight End",
  PK: "Kicker",
  "DT+DE": "Defensive Line (DT / DE)",
  LB: "Linebacker",
  "CB+S": "Defensive Back (CB / S)",
};

export default function RulesScoring() {
  const { league, scoring } = useAppData();
  const events = Object.entries(scoring.events);

  return (
    <div>
      <div className="page-head">
        <h1>Rules & Scoring</h1>
        <p>
          {league.name} — {league.keeperType} league, {league.franchiseCount} teams. This is the exact
          scoring the Draft Helper uses to value players, pulled live from MyFantasyLeague.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>
          Starting lineup — {league.starters.count} starters
        </h3>
        <div className="cols">
          {league.starters.slots.map((s) => (
            <div className="row spread" key={s.name} style={{ fontSize: 14 }}>
              <span>{SLOT_LABEL[s.name] ?? s.name}</span>
              <span className="val">
                {s.min === s.max ? s.min : `${s.min}–${s.max}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="cols">
        {CATS.map((cat) => {
          const rows = events
            .filter(([code]) => EVENT_META[code]?.cat === cat)
            .sort((a, b) => Math.abs(b[1].coef) - Math.abs(a[1].coef));
          if (rows.length === 0) return null;
          return (
            <div className="card" key={cat}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>{cat}</h3>
              <table className="table">
                <tbody>
                  {rows.map(([code, ev]) => (
                    <tr key={code}>
                      <td>{EVENT_META[code].label}</td>
                      <td className="num val" style={{ color: ev.coef < 0 ? "var(--bad)" : undefined }}>
                        {fmtCoef(code, ev)}
                      </td>
                      <td className="num faint" style={{ fontSize: 12 }}>/ {EVENT_META[code].unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {events.some(([code]) => !EVENT_META[code]) && (
        <p className="faint" style={{ marginTop: 14, fontSize: 12 }}>
          Unmapped scoring codes:{" "}
          {events.filter(([code]) => !EVENT_META[code]).map(([code]) => code).join(", ")}
        </p>
      )}
    </div>
  );
}
