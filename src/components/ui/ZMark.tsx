import { useId } from 'react';

interface ZMarkProps {
  size?: number;
  /** 0..1 — draws the ribbon Z as cooking/loading progress */
  progress?: number;
  className?: string;
  title?: string;
}

/**
 * The Zesto ribbon-Z. Recurs as the brand mark, the loading state and the cooking
 * progress indicator (§3). One continuous stroke; `progress` reveals it.
 */
export function ZMark({ size = 40, progress, className, title = 'Zesto' }: ZMarkProps) {
  const animated = progress != null;
  const pathLen = 100;
  const dash = animated ? pathLen * Math.max(0, Math.min(1, progress)) : pathLen;
  const gid = `zmark-${useId()}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gid} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="rgb(var(--z-purple))" />
          <stop offset="0.5" stopColor="rgb(var(--z-yellow))" />
          <stop offset="1" stopColor="rgb(var(--z-blue))" />
        </linearGradient>
      </defs>
      <path
        d="M18 19 H46 L18 45 H46"
        fill="none"
        stroke="rgb(var(--z-line))"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={animated ? 0.5 : 0}
      />
      <path
        d="M18 19 H46 L18 45 H46"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={pathLen}
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen - dash}
        style={animated ? { transition: 'stroke-dashoffset .5s var(--z-ease)' } : undefined}
      />
      {/* leaf terminal, echoing the official mark */}
      <path d="M48 13 q6 3 4 9 q-6 -1 -4 -9 Z" fill="rgb(var(--z-blue))" />
    </svg>
  );
}

export function ZWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <ZMark size={26} />
      <span className="z-gradient-text text-xl tracking-tight">Zesto</span>
    </span>
  );
}
