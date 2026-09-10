import type { ReactNode } from 'react';

export function Chip({
  active,
  onClick,
  children,
  as = 'button',
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  as?: 'button' | 'span';
}) {
  const cls = 'z-chip z-tap !py-2';
  if (as === 'span') return <span className={cls}>{children}</span>;
  return (
    <button type="button" className={cls} data-active={active ? 'true' : 'false'} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  onClick,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'article';
}) {
  const Comp = as;
  return (
    <Comp className={`z-card p-4 ${onClick ? 'cursor-pointer hover:border-brand/40 transition-colors' : ''} ${className}`} onClick={onClick}>
      {children}
    </Comp>
  );
}

export function Stat({
  value,
  label,
  hint,
  accent,
}: {
  value: ReactNode;
  label: string;
  hint?: string;
  accent?: 'brand' | 'warm' | 'positive';
}) {
  const color =
    accent === 'warm' ? 'text-caution' : accent === 'positive' ? 'text-positive' : accent === 'brand' ? 'text-brand' : 'text-content';
  return (
    <div>
      <div className={`z-stat-num text-2xl ${color}`}>{value}</div>
      <div className="text-xs font-semibold text-content-muted mt-0.5">{label}</div>
      {hint && <div className="text-2xs text-content-faint mt-0.5">{hint}</div>}
    </div>
  );
}

export function MetricTile({
  value,
  label,
  sub,
  tone = 'default',
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  tone?: 'default' | 'brand' | 'warm' | 'positive';
}) {
  const ring =
    tone === 'brand'
      ? 'border-brand/30 bg-brand/5'
      : tone === 'warm'
        ? 'border-caution/30 bg-caution/5'
        : tone === 'positive'
          ? 'border-positive/30 bg-positive/5'
          : 'border-line bg-surface-raised';
  return (
    <div className={`rounded-lg border p-3.5 ${ring}`}>
      <div className="z-stat-num text-xl">{value}</div>
      <div className="text-xs font-semibold text-content-muted mt-1">{label}</div>
      {sub && <div className="text-2xs text-content-faint mt-0.5">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'warm' | 'positive' | 'critical';
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-content-muted',
    brand: 'bg-brand/12 text-brand',
    warm: 'bg-caution/12 text-caution',
    positive: 'bg-positive/12 text-positive',
    critical: 'bg-critical/12 text-critical',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon = '🍳',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6 animate-rise">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="text-sm text-content-muted mt-1.5 max-w-xs mx-auto">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-sunken ${className}`} />;
}

export function SectionHeader({
  title,
  action,
  sub,
}: {
  title: string;
  action?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-content-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** the honest "estimated" marker the product must show on cost & calories (§12, §13) */
export function EstimateTag({ label = 'estimated' }: { label?: string }) {
  return (
    <span className="text-2xs text-content-faint font-medium" title="Approximate — not a guarantee">
      · {label}
    </span>
  );
}
