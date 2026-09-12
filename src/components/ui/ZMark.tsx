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

const MARK_SRC = `${import.meta.env.BASE_URL}zesto-mark.png`;

/** The official ribbon-Z mark (real artwork, transparent) + the Zesto wordmark. */
export function ZWordmark({ className = '', size = 26 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <img
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: 'auto' }}
        className="select-none"
        draggable={false}
      />
      <span className="z-gradient-text tracking-tight" style={{ fontSize: size * 0.8 }}>
        Zesto
      </span>
    </span>
  );
}

/** Larger lockup for hero / about surfaces. */
export function ZLockup({ className = '', size = 56 }: { className?: string; size?: number }) {
  return <ZWordmark size={size} className={className} />;
}

/**
 * The official mark alone, at full visibility by default — for use as a primary icon
 * (e.g. the spinning centerpiece on Surprise.tsx's dice-roll), not a faded background
 * watermark (see `ZWatermark` below, which is this with `opacity` turned down).
 */
export function ZImage({ size = 44, opacity = 1, className = '' }: { size?: number; opacity?: number; className?: string }) {
  return (
    <img
      src={MARK_SRC}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: 'auto', opacity }}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}

/**
 * The official mark, faded, as a background watermark on a recipe's gradient art
 * (Discover cards, recipe detail hero — §3's "recipe cards" recurrence). Real artwork,
 * not the animated stand-in `ZMark` — that one stays reserved for loading/progress states
 * that genuinely need an SVG (cook-mode's progressive stroke reveal — a plain rotation,
 * like Surprise.tsx's dice-roll, works identically on `ZImage`).
 */
export function ZWatermark({ size = 44, opacity = 0.45, className = '' }: { size?: number; opacity?: number; className?: string }) {
  return <ZImage size={size} opacity={opacity} className={className} />;
}
