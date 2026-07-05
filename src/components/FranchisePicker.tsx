import { OTHER } from "../store/draftStore";
import type { League } from "../types";

/**
 * Dropdown of every franchise in the league (plus "unknown team"), used to assign
 * a taken pick to a specific franchise so the MFL import CSV can be complete.
 */
export default function FranchisePicker({
  league,
  onPick,
  label = "Taken by…",
  ariaLabel,
  className = "select sm",
}: {
  league: League;
  onPick: (franchiseId: string) => void;
  label?: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      className={className}
      aria-label={ariaLabel}
      value=""
      onChange={(e) => {
        const value = e.target.value;
        if (value) onPick(value);
        e.target.value = "";
      }}
    >
      <option value="" disabled>
        {label}
      </option>
      {league.franchises.map((f) => (
        <option key={f.id} value={f.id}>
          {f.abbrev || f.name}
        </option>
      ))}
      <option value={OTHER}>Unknown team</option>
    </select>
  );
}
