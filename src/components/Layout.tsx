import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useOnline } from '../lib/hooks';
import { ZWordmark } from './ui/ZMark';
import { Icon, type IconName } from './ui/Icon';

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'nav-home', end: true },
  { to: '/discover', label: 'Discover', icon: 'nav-discover' },
  { to: '/pantry', label: 'Pantry', icon: 'nav-pantry' },
  { to: '/planner', label: 'Planner', icon: 'nav-planner' },
  { to: '/profile', label: 'You', icon: 'nav-profile' },
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
                    <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.5 : 2} />
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

