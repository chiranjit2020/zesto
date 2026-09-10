import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useOnline } from '../lib/hooks';
import { ZWordmark } from './ui/ZMark';

const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/discover', label: 'Discover', icon: SearchIcon },
  { to: '/pantry', label: 'Pantry', icon: BasketIcon },
  { to: '/planner', label: 'Planner', icon: CalendarIcon },
  { to: '/profile', label: 'You', icon: PersonIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { pathname } = useLocation();
  const hideChrome = pathname.startsWith('/cook/');

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {!hideChrome && (
        <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-line">
          <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
            <NavLink to="/" aria-label="Zesto home">
              <ZWordmark />
            </NavLink>
            <NavLink
              to="/profile"
              className="text-xs font-semibold text-content-muted hover:text-content"
            >
              {online ? '' : '· offline'}
            </NavLink>
          </div>
        </header>
      )}

      {!online && !hideChrome && <OfflineBanner />}

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pb-28 pt-4">{children}</main>

      {!hideChrome && (
        <nav
          className="fixed bottom-0 inset-x-0 z-30 bg-surface/90 backdrop-blur-md border-t border-line pb-safe"
          aria-label="Primary"
        >
          <div className="mx-auto max-w-2xl grid grid-cols-5">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-2xs font-semibold transition-colors ${
                    isActive ? 'text-brand' : 'text-content-faint hover:text-content-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <t.icon active={isActive} />
                    {t.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="bg-caution/12 text-caution text-xs font-semibold text-center py-2 px-4">
      You're offline. Saved recipes, pantry and cooking mode still work.
    </div>
  );
}

/* --- tiny inline icons (no dependency, theme-aware via currentColor) --- */
type IP = { active?: boolean };
const s = (active?: boolean) => ({ width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: active ? 2.4 : 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

function HomeIcon({ active }: IP) {
  return <svg viewBox="0 0 24 24" {...s(active)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
}
function SearchIcon({ active }: IP) {
  return <svg viewBox="0 0 24 24" {...s(active)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
function BasketIcon({ active }: IP) {
  return <svg viewBox="0 0 24 24" {...s(active)}><path d="M4 9h16l-1.5 10.5A2 2 0 0 1 16.5 21h-9A2 2 0 0 1 5.5 19.5L4 9Z" /><path d="M9 9 12 3l3 6" /></svg>;
}
function CalendarIcon({ active }: IP) {
  return <svg viewBox="0 0 24 24" {...s(active)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
}
function PersonIcon({ active }: IP) {
  return <svg viewBox="0 0 24 24" {...s(active)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" /></svg>;
}
