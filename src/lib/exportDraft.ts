import type { League, Rookie } from "../types";
import { displayName, franchiseName } from "./format";
import { OTHER } from "../store/draftStore";

/**
 * MFL commissioner "Import Draft Picks" format.
 * One line per pick in draft order: franchise_id,player_id
 * Picks marked as OTHER (opponent, unknown team) are omitted — MFL requires a valid franchise.
 */
export function buildMflImportCsv(
  pickOrder: string[],
  draftedBy: Record<string, string>,
): string {
  const rows = pickOrder
    .filter((id) => draftedBy[id] && draftedBy[id] !== OTHER)
    .map((id) => `${draftedBy[id]},${id}`);
  return rows.join("\n");
}

/** Quote a CSV field per RFC 4180: wrap in quotes and double any embedded quotes. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Human-readable CSV with round/pick numbers, franchise names, player names, and positions.
 * Useful for record-keeping or sharing results outside MFL.
 * Assumes a straight (non-snake) pick order for round/pick calculations.
 */
export function buildDetailCsv(
  pickOrder: string[],
  draftedBy: Record<string, string>,
  rookies: Rookie[],
  league: League,
): string {
  const rookieById = new Map(rookies.map((r) => [r.id, r]));
  const teams = league.franchiseCount;
  const header = "pick,round,pick_in_round,franchise_id,franchise_name,player_id,player_name,position,nfl_team";

  const rows = pickOrder.map((playerId, i) => {
    const franchiseId = draftedBy[playerId];
    const rookie = rookieById.get(playerId);
    const overall = i + 1;
    const round = Math.ceil(overall / teams);
    const pickInRound = ((overall - 1) % teams) + 1;
    const fid = !franchiseId || franchiseId === OTHER ? "" : franchiseId;
    const fname = !franchiseId || franchiseId === OTHER ? "Unknown" : franchiseName(league, franchiseId);
    const pname = rookie ? displayName(rookie.name) : playerId;
    const pos = rookie?.pos ?? "";
    const nflTeam = rookie?.team ?? "";
    return [overall, round, pickInRound, fid, csvField(fname), playerId, csvField(pname), pos, nflTeam].join(",");
  });

  return [header, ...rows].join("\n");
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
