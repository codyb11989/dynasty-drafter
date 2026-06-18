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

async function getJson<T>(name: string, bust?: boolean): Promise<T> {
  // A cache-busting query param + no-store forces a fresh network fetch, bypassing
  // both the HTTP cache and the Workbox precache (which keys on the exact URL).
  const url = `${BASE}data/${name}${bust ? `?t=${Date.now()}` : ""}`;
  const res = await fetch(url, bust ? { cache: "no-store" } : undefined);
  if (!res.ok) throw new Error(`Failed to load ${name} (${res.status})`);
  return res.json() as Promise<T>;
}

/**
 * Load the league data bundle from public/data/.
 * Pass `{ bust: true }` for a manual sync — re-fetches fresh from the network
 * instead of the offline cache, picking up the latest deployed `npm run sync`.
 */
export async function loadAllData(opts: { bust?: boolean } = {}): Promise<AppData> {
  const { bust } = opts;
  const [league, scoring, rosters, players, adp, rookies, meta] = await Promise.all([
    getJson<League>("league.json", bust),
    getJson<Scoring>("scoring.json", bust),
    getJson<Rosters>("rosters.json", bust),
    getJson<PlayerMap>("players.json", bust),
    getJson<AdpMap>("adp.json", bust),
    getJson<Rookie[]>("rookies.json", bust),
    getJson<Meta>("meta.json", bust),
  ]);
  return { league, scoring, rosters, players, adp, rookies, meta };
}
