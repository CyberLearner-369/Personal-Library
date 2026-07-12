import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between gap-2 text-muted">
        <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-1 font-display text-[27px] font-semibold leading-tight text-ink">
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-faint">{sub}</p>}
    </div>
  );
}
