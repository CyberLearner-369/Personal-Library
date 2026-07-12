import { CHART_COLORS } from '@/lib/spine';
import type { CountItem } from '@/lib/stats';

/**
 * Dependency-free SVG donut. Uses the spine-colour palette so charts feel
 * like the shelf; the legend carries the accessible values.
 */
export function Donut({
  items,
  title,
  limit = 6,
}: {
  items: CountItem[];
  title: string;
  limit?: number;
}) {
  const top = items.slice(0, limit);
  const restCount = items.slice(limit).reduce((sum, item) => sum + item.count, 0);
  const data = restCount > 0 ? [...top, { label: 'Other', count: restCount }] : top;
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return <p className="text-sm text-faint">Nothing to chart yet.</p>;
  }

  // r = 100 / 2π so the circumference is exactly 100 units.
  const radius = 15.9155;
  let cumulative = 0;
  const segments = data.map((item, index) => {
    const pct = (item.count / total) * 100;
    const segment = {
      ...item,
      pct,
      offset: 25 - cumulative,
      color: item.label === 'Other' ? 'rgb(var(--c-faint))' : CHART_COLORS[index % CHART_COLORS.length],
    };
    cumulative += pct;
    return segment;
  });

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <svg
        viewBox="0 0 42 42"
        className="h-36 w-36 shrink-0"
        role="img"
        aria-label={`${title}: ${data.map((d) => `${d.label} ${d.count}`).join(', ')}`}
      >
        <circle
          cx="21"
          cy="21"
          r={radius}
          fill="none"
          strokeWidth="5.5"
          style={{ stroke: 'rgb(var(--c-sunken))' }}
        />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            strokeWidth="5.5"
            stroke={segment.color}
            strokeDasharray={`${segment.pct} ${100 - segment.pct}`}
            strokeDashoffset={segment.offset}
            strokeLinecap="butt"
          />
        ))}
        <text
          x="21"
          y="20"
          textAnchor="middle"
          className="font-display font-semibold"
          style={{ fill: 'rgb(var(--c-ink))', fontSize: '8px' }}
        >
          {total}
        </text>
        <text
          x="21"
          y="26"
          textAnchor="middle"
          style={{ fill: 'rgb(var(--c-muted))', fontSize: '3.2px' }}
        >
          books
        </text>
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-ink" title={segment.label}>
              {segment.label}
            </span>
            <span className="tabular-nums text-muted">
              {segment.count}
              <span className="ml-1.5 text-faint">{Math.round(segment.pct)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
