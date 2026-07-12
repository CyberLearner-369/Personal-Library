import type { CountItem } from '@/lib/stats';

/**
 * Horizontal bar list — the workhorse chart. Rendered as a plain list so
 * screen readers announce every label and value without extra markup.
 */
export function BarList({
  items,
  limit = 8,
  format = (item) => String(item.count),
  onSelect,
}: {
  items: CountItem[];
  limit?: number;
  format?: (item: CountItem) => string;
  onSelect?: (label: string) => void;
}) {
  const top = items.slice(0, limit);
  const max = Math.max(1, ...top.map((item) => item.count));

  if (top.length === 0) {
    return <p className="text-sm text-faint">Nothing to chart yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {top.map((item) => {
        const row = (
          <>
            <span
              className="w-32 truncate text-left text-sm text-ink sm:w-40"
              title={item.label}
            >
              {item.label}
            </span>
            <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted">
              {format(item)}
            </span>
          </>
        );
        return (
          <li key={item.label}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.label)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-sunken"
              >
                {row}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-1 py-0.5">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
