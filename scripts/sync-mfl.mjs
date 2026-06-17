// ---------------------------------------------------------------------------
// MFL sync — pulls league config, scoring, rosters, players & rookie ADP from
// MyFantasyLeague and writes normalized JSON into public/data/.
//
// Run before the draft (whenever you have internet):  npm run sync
// The app then reads the cached JSON and works fully offline on draft day.
//
// No login is required: this league's export endpoints are publicly readable
// ("private" only blocks *changes*). If MFL ever starts requiring auth, set
// MFL_USERNAME / MFL_PASSWORD env vars and we can add a login step.
// ---------------------------------------------------------------------------
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { projectRookie, POS_GROUP } from "./projections.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const CACHE_DIR = join(__dirname, ".cache");

// ---- League config (override via env) -------------------------------------
const YEAR = process.env.MFL_YEAR || "2026";
const LEAGUE_ID = process.env.MFL_LEAGUE || "21931";
const LEAGUE_HOST = process.env.MFL_HOST || "www46.myfantasyleague.com";
const API_HOST = "api.myfantasyleague.com";

// Some export types must hit the shared api host instead of the league server.
const API_HOST_TYPES = new Set(["players", "adp"]);
// ADP is a cross-league report and is rejected if scoped with a league id.
const GLOBAL_TYPES = new Set(["adp"]);

const USER_AGENT = "dynasty-drafter/0.1 (league hub sync)";

async function fetchType(type, extraParams = {}) {
  const host = API_HOST_TYPES.has(type) ? API_HOST : LEAGUE_HOST;
  const base = GLOBAL_TYPES.has(type)
    ? { TYPE: type, JSON: "1" }
    : { TYPE: type, L: LEAGUE_ID, JSON: "1" };
  const params = new URLSearchParams({ ...base, ...extraParams });
  const url = `https://${host}/${YEAR}/export?${params}`;
  const cacheFile = join(CACHE_DIR, `${type}.json`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.error) throw new Error(`MFL error: ${json.error.$t || JSON.stringify(json.error)}`);
      await writeFile(cacheFile, text); // raw cache for debugging
      return json;
    } catch (err) {
      console.warn(`  ! ${type} attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      } else if (existsSync(cacheFile)) {
        console.warn(`  → falling back to cached ${type}.json`);
        return JSON.parse(await readFile(cacheFile, "utf8"));
      } else {
        throw err;
      }
    }
  }
}

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const t = (x) => (x && typeof x === "object" && "$t" in x ? x.$t : x);

// ---- Normalizers ----------------------------------------------------------

function parseStarters(league) {
  const slots = asArray(league.starters?.position).map((p) => {
    const limit = String(p.limit ?? "");
    let min, max;
    if (limit.includes("-")) {
      [min, max] = limit.split("-").map(Number);
    } else {
      min = max = Number(limit);
    }
    return { name: p.name, min, max };
  });
  return { count: Number(league.starters?.count) || 0, slots };
}

function normalizeLeague(league) {
  return {
    id: LEAGUE_ID,
    year: YEAR,
    host: LEAGUE_HOST,
    name: league.name,
    keeperType: league.keeperType,
    franchiseCount: asArray(league.franchises?.franchise).length,
    starters: parseStarters(league),
    franchises: asArray(league.franchises?.franchise)
      .map((f) => ({
        id: f.id,
        name: f.name,
        abbrev: f.abbrev || null,
        division: f.division ?? null,
        logo: f.logo || null,
        icon: f.icon || null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

// MFL points strings: "*4" => multiply stat by 4; ".1/1" => 0.1 per 1 unit; etc.
function parsePoints(str) {
  const s = String(str).trim();
  if (s.startsWith("*")) return { kind: "mult", coef: Number(s.slice(1)) };
  if (s.includes("/")) {
    const [pts, per] = s.split("/").map(Number);
    return { kind: "perUnit", coef: pts / (per || 1) };
  }
  return { kind: "flat", coef: Number(s) };
}

function normalizeScoring(rules) {
  const out = {};
  for (const rule of asArray(rules.positionRules?.rule)) {
    const code = t(rule.event);
    const { kind, coef } = parsePoints(t(rule.points));
    out[code] = { coef, kind, range: t(rule.range) ?? null };
  }
  return { positions: rules.positionRules?.positions ?? "", events: out };
}

function normalizeRosters(rosters) {
  const out = {};
  for (const fr of asArray(rosters.franchise)) {
    out[fr.id] = asArray(fr.player)
      .filter((p) => p.status === "ROSTER")
      .map((p) => p.id);
  }
  return out;
}

function normalizePlayers(players) {
  const map = {};
  const rookies = [];
  for (const p of asArray(players.players?.player)) {
    // skip team-defense / coach / unit pseudo-positions
    if (/^TM|Def|^ST$|^Off$|Coach|^PN$|^XX$/.test(p.position)) continue;
    const entry = {
      id: p.id,
      name: p.name, // "Last, First"
      pos: p.position,
      team: p.team,
      group: POS_GROUP[p.position] || null,
      rookie: p.status === "R",
    };
    map[p.id] = entry;
    if (entry.rookie) rookies.push(p.id);
  }
  return { map, rookieIds: rookies };
}

function normalizeAdp(adp) {
  const out = {};
  for (const p of asArray(adp.adp?.player)) {
    out[p.id] = {
      avgPick: Number(p.averagePick),
      rank: Number(p.rank),
      minPick: Number(p.minPick),
      maxPick: Number(p.maxPick),
      drafts: Number(p.draftsSelectedIn),
    };
  }
  return out;
}

// ---- Main -----------------------------------------------------------------
async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  console.log(`Syncing MFL league ${LEAGUE_ID} (${YEAR}) from ${LEAGUE_HOST} …`);

  const [leagueRaw, rulesRaw, rostersRaw, playersRaw] = await Promise.all([
    fetchType("league").then((d) => d.league),
    fetchType("rules").then((d) => d.rules),
    fetchType("rosters").then((d) => d.rosters),
    fetchType("players", { DETAILS: "0" }).then((d) => d),
  ]);

  const league = normalizeLeague(leagueRaw);
  const scoring = normalizeScoring(rulesRaw);
  const rosters = normalizeRosters(rostersRaw);
  const { map: playerMap, rookieIds } = normalizePlayers(playersRaw);

  console.log(`  franchises: ${league.franchiseCount}, players: ${Object.keys(playerMap).length}, rookies: ${rookieIds.length}`);

  // Fetch draft capital for rookies (DETAILS=1, batched) and ADP.
  const details = await fetchRookieDetails(rookieIds);
  const adp = normalizeAdp(normalizeAdpSource(await fetchAdp()));

  // Build the projected rookie pool.
  const rookiePool = rookieIds
    .map((id) => {
      const base = playerMap[id];
      const d = details[id] || {};
      const proj = projectRookie({
        position: base.pos,
        draft_round: d.draft_round,
        draft_pick: d.draft_pick,
      });
      const a = adp[id];
      return {
        id,
        name: base.name,
        pos: base.pos,
        group: base.group,
        team: base.team,
        draftRound: d.draft_round ? Number(d.draft_round) : null,
        draftPick: d.draft_pick ? Number(d.draft_pick) : null,
        draftTeam: d.draft_team || base.team,
        college: d.college || null,
        tier: proj.tier,
        stats: proj.stats,
        projPointsOverride: proj.projPointsOverride ?? null,
        adp: a ? a.avgPick : null,
        adpRank: a ? a.rank : null,
      };
    })
    // Drop pure non-fantasy noise (e.g. long snappers slipping through)
    .filter((r) => r.group);

  // Write everything.
  await Promise.all([
    writeJson("league.json", league),
    writeJson("scoring.json", scoring),
    writeJson("rosters.json", rosters),
    writeJson("players.json", playerMap),
    writeJson("adp.json", adp),
    writeJson("rookies.json", rookiePool),
    writeJson("meta.json", {
      syncedAt: new Date().toISOString(),
      year: YEAR,
      leagueId: LEAGUE_ID,
      rookieCount: rookiePool.length,
    }),
  ]);

  console.log(`✓ Wrote ${rookiePool.length} rookies + league data to public/data/`);
  console.log(`  Synced at ${new Date().toLocaleString()}`);
}

async function fetchRookieDetails(ids) {
  // DETAILS=1 in batches to keep URLs reasonable.
  const out = {};
  const batchSize = 60;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const d = await fetchType("players", { PLAYERS: batch.join(","), DETAILS: "1" });
    for (const p of asArray(d.players?.player)) out[p.id] = p;
  }
  return out;
}

async function fetchAdp() {
  // Keeper/dynasty ADP — for a rookie draft the relevant entries are rookies.
  // PERIOD=ALL gives the broadest sample (RECENT is often empty this early).
  return fetchType("adp", { PERIOD: "ALL", IS_KEEPER: "K", IS_PPR: "-1" });
}
function normalizeAdpSource(d) {
  return d; // already in {adp:{player:[...]}} shape
}

async function writeJson(name, obj) {
  await writeFile(join(DATA_DIR, name), JSON.stringify(obj, null, 0));
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
