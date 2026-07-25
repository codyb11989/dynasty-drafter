import type { Injury } from "../types";

// Compact labels for the row badge — the full status/detail lives in the title
// tooltip and the expanded player detail.
const SHORT_LABEL: Record<string, string> = {
  RETIRED: "RET",
  SUSPENDED: "SUSP",
  QUESTIONABLE: "Q",
  DOUBTFUL: "D",
  HOLDOUT: "HOLD",
  PROBABLE: "P",
};

export function injuryLabel(injury: Injury): string {
  const key = injury.status.toUpperCase();
  return SHORT_LABEL[key] ?? injury.status.toUpperCase();
}

export function injuryTitle(injury: Injury): string {
  const parts = [injury.status];
  if (injury.details) parts.push(injury.details);
  // expReturn is unreliable in the offseason, so label it as MFL's claim rather
  // than presenting it as fact.
  if (injury.expReturn) parts.push(`MFL est. return ${injury.expReturn}`);
  return parts.join(" · ");
}

/**
 * Injury flag shown next to a player's name.
 *
 * Major statuses (won't play) get a loud red badge; the blanket offseason
 * "Questionable" gets a muted one so it doesn't drown out the real signal.
 */
export default function InjuryBadge({ injury }: { injury: Injury }) {
  const major = injury.severity === "major";
  return (
    <span
      className={`tag injury${major ? " injury-major" : ""}`}
      title={injuryTitle(injury)}
      aria-label={`Injury status: ${injuryTitle(injury)}`}
    >
      {major ? "⚠ " : ""}
      {injuryLabel(injury)}
    </span>
  );
}
