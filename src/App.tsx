import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useApplyTheme } from './app/theme';
import { ZMark } from './components/ui/ZMark';
import { Home } from './routes/Home';

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Loading() {
  return (
    <div className="grid place-items-center py-24">
      <div className="animate-pulse">
        <ZMark size={48} />
      </div>
    </div>
  );
}

export default function App() {
  useApplyTheme();

  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
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
      </Suspense>
    </Layout>
  );
}
