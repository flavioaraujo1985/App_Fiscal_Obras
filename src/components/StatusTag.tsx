import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

interface StatusTagProps {
  label: string;
  tone?: StatusTone;
}

const TONE_MAP: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-blue-50 text-[#004A8F] border-blue-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-red-50 text-red-800 border-red-200',
};

export default function StatusTag({ label, tone = 'neutral' }: StatusTagProps) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
      ? AlertTriangle
      : tone === 'error'
      ? AlertCircle
      : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${TONE_MAP[tone]}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
