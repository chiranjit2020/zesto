import { useEffect } from 'react';
import type { ReactNode } from 'react';

/** Bottom sheet / dialog. Traps scroll, closes on Esc + backdrop, respects safe area. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-rise"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md bg-surface-raised border-t sm:border border-line
          rounded-t-2xl sm:rounded-2xl shadow-pop max-h-[88dvh] flex flex-col animate-rise"
      >
        <div className="pt-2.5 flex justify-center sm:hidden" aria-hidden>
          <div className="h-1 w-9 rounded-full bg-line" />
        </div>
        {title && (
          <div className="px-5 pt-3 pb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="z-tap -mr-2 text-content-faint hover:text-content text-xl"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 pb-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-line pb-safe bg-surface-raised">{footer}</div>
        )}
      </div>
    </div>
  );
}
