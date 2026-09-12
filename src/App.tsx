import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useApplyTheme } from './app/theme';
import { ZMark } from './components/ui/ZMark';
import { MotionProvider, AnimatePresence, m, pageVariants } from './components/ui/motion';
import { Home } from './routes/Home';
import { useNotifications } from './state/notifications';

const WhatCanIMake = lazy(() => import('./routes/WhatCanIMake').then((m) => ({ default: m.WhatCanIMake })));
const Broke = lazy(() => import('./routes/Broke').then((m) => ({ default: m.Broke })));
const Tired = lazy(() => import('./routes/Tired').then((m) => ({ default: m.Tired })));
const Midnight = lazy(() => import('./routes/Midnight').then((m) => ({ default: m.Midnight })));
const Leftovers = lazy(() => import('./routes/Leftovers').then((m) => ({ default: m.Leftovers })));
const Surprise = lazy(() => import('./routes/Surprise').then((m) => ({ default: m.Surprise })));
const Improviser = lazy(() => import('./routes/Improviser').then((m) => ({ default: m.Improviser })));
const Discover = lazy(() => import('./routes/Discover').then((m) => ({ default: m.Discover })));
const RecipeDetail = lazy(() => import('./routes/RecipeDetail').then((m) => ({ default: m.RecipeDetail })));
const CookMode = lazy(() => import('./routes/CookMode').then((m) => ({ default: m.CookMode })));
const Pantry = lazy(() => import('./routes/Pantry').then((m) => ({ default: m.Pantry })));
const Planner = lazy(() => import('./routes/Planner').then((m) => ({ default: m.Planner })));
const Profile = lazy(() => import('./routes/Profile').then((m) => ({ default: m.Profile })));
const About = lazy(() => import('./routes/Misc').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('./routes/Misc').then((m) => ({ default: m.NotFound })));

function useScrollToTop(key: string) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}

function Loading() {
  return (
    <div className="grid place-items-center py-24">
      <m.div animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }}>
        <ZMark size={48} />
      </m.div>
    </div>
  );
}

/** the cooking screen is its own full-screen surface — no page-transition chrome */
const FULLSCREEN = /^\/cook\//;

/**
 * Foreground push messages (spec §18) only need wiring up for users who've actually
 * enabled notifications — dynamically imported so the Firebase Messaging SDK never
 * touches the initial bundle for everyone else (it's otherwise isolated to the
 * lazy-loaded Profile chunk, see docs/NOTIFICATIONS_PLAN.md).
 */
function useForegroundNotifications() {
  const enabled = useNotifications((s) => s.enabled);
  useEffect(() => {
    if (!enabled) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    import('./lib/notifications/foreground').then(({ listenForForegroundMessages }) =>
      listenForForegroundMessages().then((unsub) => {
        if (cancelled) unsub?.();
        else unsubscribe = unsub;
      }),
    );
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [enabled]);
}

/**
 * Opt-in pantry + meal-history sync (spec §9 Q3, docs/NOTIFICATIONS_PLAN.md) — same
 * dynamic-import-behind-`enabled` shape as `useForegroundNotifications` above, so the
 * sync module (and its subscriptions to usePantry/useKitchen) never loads for the
 * majority of users who haven't opted into notifications at all.
 */
function useDataSync() {
  const enabled = useNotifications((s) => s.enabled);
  const deviceId = useNotifications((s) => s.deviceId);
  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    import('./lib/notifications/dataSync').then(({ startDataSync }) => {
      if (cancelled) return;
      stop = startDataSync(deviceId);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled, deviceId]);
}

export default function App() {
  useApplyTheme();
  useForegroundNotifications();
  useDataSync();
  const location = useLocation();
  useScrollToTop(location.pathname);
  const fullscreen = FULLSCREEN.test(location.pathname);

  const routes = (
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/make" element={<WhatCanIMake />} />
      <Route path="/broke" element={<Broke />} />
      <Route path="/tired" element={<Tired />} />
      <Route path="/midnight" element={<Midnight />} />
      <Route path="/leftovers" element={<Leftovers />} />
      <Route path="/surprise" element={<Surprise />} />
      <Route path="/improvise" element={<Improviser />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/r/:slug" element={<RecipeDetail />} />
      <Route path="/cook/:slug" element={<CookMode />} />
      <Route path="/pantry" element={<Pantry />} />
      <Route path="/planner" element={<Planner />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <MotionProvider>
      <Layout>
        <Suspense fallback={<Loading />}>
          {fullscreen ? (
            routes
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={pageKey(location.pathname)} variants={pageVariants} initial="initial" animate="enter" exit="exit">
                {routes}
              </m.div>
            </AnimatePresence>
          )}
        </Suspense>
      </Layout>
    </MotionProvider>
  );
}

/** Transition on top-level section change, not on every query-param tweak. */
function pageKey(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] === 'r') return 'recipe';
  return seg[0] ?? 'home';
}
