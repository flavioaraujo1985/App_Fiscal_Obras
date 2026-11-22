import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  action?: ReactNode;
}

export default function StatCard({
  title,
  value,
  subtitle,
  tone = 'default',
  action,
}: StatCardProps) {
  const valueToneClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
      ? 'text-amber-700'
      : tone === 'danger'
      ? 'text-red-700'
      : 'text-slate-900';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        {action}
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${valueToneClass}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
    </div>
  );
}
