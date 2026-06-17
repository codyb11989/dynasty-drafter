import type { PosGroup } from "../types";
import { GROUP_COLOR } from "../lib/format";

/** Small colored position chip. Shows the raw position (DE/CB/S…) with the
 *  group color, or just the group when no raw position is given. */
export default function PositionBadge({ group, pos }: { group: PosGroup; pos?: string }) {
  return (
    <span className="pos" style={{ ["--c" as string]: GROUP_COLOR[group] }}>
      {pos ?? group}
    </span>
  );
}
