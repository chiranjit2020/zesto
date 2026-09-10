interface Option<T> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  label,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex flex-wrap gap-1 rounded-full bg-surface-sunken p-1 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full font-semibold transition-all z-tap ${
              size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2'
            } ${
              active
                ? 'bg-surface-raised text-content shadow-card'
                : 'text-content-muted hover:text-content'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RangeControl({
  label,
  min,
  max,
  step,
  value,
  suffix = '',
  prefix = '',
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix?: string;
  prefix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-semibold mb-2">
        {label}
        <span className="z-stat-num text-brand">
          {prefix}
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--z-brand))] h-2"
      />
    </label>
  );
}
