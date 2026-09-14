import type { ReactNode } from 'react';

export interface StatItem {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: ReactNode;
}

interface Props {
  items: StatItem[];
}

export function StatsRow({ items }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="glass relative overflow-hidden p-4">
          {item.icon && (
            <span className="absolute right-3 top-3 text-muted" style={{ color: item.accent }}>
              {item.icon}
            </span>
          )}
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{item.label}</p>
          <p className="mt-1 font-heading text-xl font-bold" style={{ color: item.accent }}>
            {item.value}
          </p>
          {item.sub && <p className="mt-0.5 text-[11px] text-muted">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export default StatsRow;
