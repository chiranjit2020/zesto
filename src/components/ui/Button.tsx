import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warm' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all ' +
  'duration-200 ease-zesto active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-2 select-none';

const variants: Record<Variant, string> = {
  primary: 'grad-brand text-white shadow-glow hover:brightness-105',
  secondary: 'bg-surface-raised text-content border border-line hover:bg-surface-sunken',
  ghost: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  warm: 'grad-warm text-ink shadow-[0_6px_24px_-6px_rgb(var(--z-amber)/0.6)] hover:brightness-105',
  danger: 'bg-critical/10 text-critical border border-critical/30 hover:bg-critical/15',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 min-h-[38px]',
  md: 'text-sm px-5 py-2.5 min-h-[44px]',
  lg: 'text-base px-6 py-3.5 min-h-[52px]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  as?: 'button';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', block, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  block,
  className = '',
  children,
  ...rest
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, 'to'>) {
  return (
    <Link
      to={to}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className={`z-tap inline-flex items-center justify-center rounded-full text-content-muted
        hover:bg-surface-sunken hover:text-content transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
