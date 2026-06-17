import type { AdpMap, League, Meta, PlayerMap, Rookie, Rosters, Scoring } from "../types";

export interface AppData {
  league: League;
  scoring: Scoring;
  rosters: Rosters;
  players: PlayerMap;
  adp: AdpMap;
  rookies: Rookie[];
  meta: Meta;
}

const BASE = import.meta.env.BASE_URL;

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}data/${name}`);
  if (!res.ok) throw new Error(`Failed to load ${name} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function loadAllData(): Promise<AppData> {
  const [league, scoring, rosters, players, adp, rookies, meta] = await Promise.all([
    getJson<League>("league.json"),
    getJson<Scoring>("scoring.json"),
    getJson<Rosters>("rosters.json"),
    getJson<PlayerMap>("players.json"),
    getJson<AdpMap>("adp.json"),
    getJson<Rookie[]>("rookies.json"),
    getJson<Meta>("meta.json"),
  ]);
  return { league, scoring, rosters, players, adp, rookies, meta };
}
