import type { SortKey } from "../lib/tableSort";

export default function SortableTh({
  label,
  sortKey,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: 1 | -1;
  onClick: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      className={className}
      onClick={() => onClick(sortKey)}
      style={{ cursor: "pointer", userSelect: "none" }}
      aria-sort={active ? (dir === 1 ? "ascending" : "descending") : "none"}
      title={`Sort by ${label}`}
    >
      {label}
      {active ? (dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
}
