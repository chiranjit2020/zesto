import { useEffect, useRef, useState } from 'react';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RECIPES } from '../data/catalog';
import { buildWhatsAppFeedbackUrl, isFeedbackConfigured } from '../lib/feedback/whatsapp';
import { track } from '../lib/track';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { ZLockup } from './ui/ZMark';
import { AnimatePresence, blurFadeUp, m } from './ui/motion';

/** Orchestrates a screen's direct children through `blurFadeUp`; also the
 *  AnimatePresence exit (whole screen blurs/fades out as one group as the next
 *  one's children stagger in). */
const SCREEN_GROUP: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  exit: { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } },
};

const SAMPLE_DISHES = RECIPES.slice(0, 3).map((r) => r.title);
const SCREEN_COUNT = 3;
const INTRO_VIDEO = 'onboarding-intro.mp4';

/**
 * First-use onboarding (MASTER PROMPT — ZESTO FIRST-USE EXPERIENCE REDESIGN.md).
 * A silent intro video plays first, then 3 bilingual (Bengali-first/English-second)
 * screens. Shown once (gated by `usePrefs().hasOnboarded` in App.tsx) or replayed on
 * demand (About → "How Zesto works", `state/onboardingUI.ts`). The bilingual screens are
 * deliberately the only bilingual surface in the app — everything they link to stays in
 * the app's existing (English) language.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  // -1 = intro video, 0..SCREEN_COUNT-1 = the bilingual screens
  const [screen, setScreen] = useState(-1);
  const navigate = useNavigate();

  useEffect(() => {
    track('onboarding_started');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track('onboarding_screen_viewed', { screen_number: screen + 1 });
  }, [screen]);

  function skip() {
    track('onboarding_skipped', { screen_number: screen + 1 });
    onDone();
  }

  function complete(action: string) {
    track('onboarding_completed', { action });
    onDone();
  }

  if (screen === -1) {
    return <IntroVideo onEnded={() => setScreen(0)} onSkip={skip} />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface px-5 pt-safe pb-safe">
      <div className="flex items-center justify-between pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: SCREEN_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === screen ? 'w-6 bg-brand' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className="text-sm font-semibold text-content-muted hover:text-content min-h-[44px] px-2 -mr-2"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6">
        <AnimatePresence mode="wait">
          <m.div key={screen} variants={SCREEN_GROUP} initial="hidden" animate="show" exit="exit">
            {screen === 0 && <IntroScreen />}
            {screen === 1 && <KitchenScreen />}
            {screen === 2 && (
              <StartScreen
                onPrimary={() => {
                  track('onboarding_primary_cta_clicked');
                  complete('primary_cta');
                  navigate('/make');
                }}
                onBrowse={() => {
                  track('onboarding_recipe_search_clicked');
                  complete('browse_recipes');
                  navigate('/discover');
                }}
                onAddRecipe={() => {
                  track('onboarding_add_recipe_clicked');
                }}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {screen < SCREEN_COUNT - 1 && (
        <div className="pb-6 max-w-md mx-auto w-full shrink-0">
          <Button block size="lg" onClick={() => setScreen((s) => s + 1)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

/** Branded intro (with sound) that plays once before the bilingual screens. Auto-advances
 *  when the video ends (or fails to load — e.g. the file 404s); tapping it does the same,
 *  so nobody's stuck waiting. Tries to autoplay with audio; browsers that block that
 *  (most, without a prior user gesture) fall back to muted autoplay plus a one-tap
 *  "unmute" prompt, rather than leaving the screen stuck on a black frame. */
function IntroVideo({ onEnded, onSkip }: { onEnded: () => void; onSkip: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setNeedsUnmute(true);
      v.play().catch(onEnded);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}${INTRO_VIDEO}`}
        playsInline
        onEnded={onEnded}
        onError={onEnded}
        onClick={onEnded}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {needsUnmute && (
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (v) {
              v.muted = false;
              setNeedsUnmute(false);
            }
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-sm
                     font-semibold text-white bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 min-h-[44px]"
        >
          <Icon name="sound" size={16} /> Tap for sound
        </button>
      )}
      <div className="absolute top-0 inset-x-0 flex justify-end pt-safe pr-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-semibold text-white/80 hover:text-white min-h-[44px] px-3"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function BilingualLine({
  bn,
  en,
  as: As = 'p',
  className = '',
}: {
  bn: string;
  en: string;
  as?: 'h1' | 'p';
  className?: string;
}) {
  return (
    <As className={className}>
      <span className="block font-bengali">{bn}</span>
      <span className="block text-content-muted font-normal">{en}</span>
    </As>
  );
}

function IntroScreen() {
  return (
    <div className="text-center space-y-6">
      <m.div variants={blurFadeUp} className="flex justify-center">
        <ZLockup size={48} />
      </m.div>
      <m.div variants={blurFadeUp}>
        <BilingualLine
          as="h1"
          bn="খিদে পেয়েছে? আজ কী রান্না করবেন?"
          en="Hungry? What will you cook today?"
          className="text-2xl font-bold text-balance leading-snug"
        />
      </m.div>
      <m.div variants={blurFadeUp}>
        <BilingualLine
          bn="Zesto খাবার ডেলিভারি করে না। আপনার কী আছে, কত বাজেট আর কত সময় আছে — সেটা দেখে কী রান্না করা যায় তা খুঁজে দেয়।"
          en="Zesto doesn't deliver food. It helps you decide what to cook based on what you have, your budget and your time."
          className="text-sm leading-relaxed"
        />
      </m.div>
      <m.div variants={blurFadeUp} className="z-card p-3.5 !bg-surface-sunken">
        <BilingualLine
          bn="Food delivery নয়। Cooking decision-এর সহকারী।"
          en="Not food delivery. Your cooking decision assistant."
          className="text-xs font-semibold"
        />
      </m.div>
    </div>
  );
}

const INGREDIENT_CHIPS = [
  { emoji: '🥔', bn: 'আলু', en: 'Potato' },
  { emoji: '🥚', bn: 'ডিম', en: 'Egg' },
  { emoji: '🧅', bn: 'পেঁয়াজ', en: 'Onion' },
  { emoji: '🍞', bn: 'পাউরুটি', en: 'Bread' },
];

const CHIP_POP: Variants = {
  hidden: { opacity: 0, scale: 0.8, filter: 'blur(6px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 380, damping: 24 } },
};

function KitchenScreen() {
  return (
    <div className="text-center space-y-6">
      <m.div variants={blurFadeUp}>
        <BilingualLine
          as="h1"
          bn="আপনার কাছে কী আছে?"
          en="What do you have?"
          className="text-2xl font-bold text-balance"
        />
      </m.div>

      <m.div
        className="flex justify-center gap-2 flex-wrap"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {INGREDIENT_CHIPS.map((c) => (
          <m.span
            key={c.en}
            variants={CHIP_POP}
            className="z-chip !py-2 flex-col !items-center gap-0.5 !rounded-2xl"
          >
            <span className="text-xl leading-none" aria-hidden>{c.emoji}</span>
            <span className="text-2xs font-semibold font-bengali">{c.bn}</span>
          </m.span>
        ))}
      </m.div>

      <m.div variants={blurFadeUp}>
        <BilingualLine
          bn="আপনার রান্নাঘরের কথা বলুন।"
          en="Tell Zesto what you have."
          className="text-sm font-semibold"
        />
      </m.div>

      <m.div variants={blurFadeUp} className="z-card p-4 space-y-2 text-sm font-bold">
        <div className="text-content-muted text-xs">Ingredients + time + budget</div>
        <div className="text-brand">↓</div>
        <div className="z-gradient-text">Zesto</div>
        <div className="text-brand">↓</div>
        <div className="space-y-1">
          {SAMPLE_DISHES.map((title) => (
            <div key={title} className="text-content font-semibold">{title}</div>
          ))}
        </div>
      </m.div>

      <m.div variants={blurFadeUp}>
        <BilingualLine
          bn="যা আছে, তাই দিয়ে কী বানানো যায় — Zesto খুঁজে দেবে।"
          en="Tell Zesto what you have. It finds what you can make."
          className="text-sm leading-relaxed"
        />
      </m.div>
    </div>
  );
}

function StartScreen({
  onPrimary,
  onBrowse,
  onAddRecipe,
}: {
  onPrimary: () => void;
  onBrowse: () => void;
  onAddRecipe: () => void;
}) {
  const addRecipeUrl = buildWhatsAppFeedbackUrl('recipe', 'onboarding');

  return (
    <div className="text-center space-y-6">
      <m.div variants={blurFadeUp}>
        <BilingualLine
          as="h1"
          bn="চলুন, শুরু করি।"
          en="Let's get started."
          className="text-2xl font-bold text-balance"
        />
      </m.div>

      <m.div variants={blurFadeUp} className="space-y-3">
        <Button block size="lg" onClick={onPrimary} className="flex-col !gap-0.5 !py-3">
          <span className="flex items-center gap-2 font-bengali">
            <Icon name="mode-make" size={18} /> আমি কী বানাতে পারি?
          </span>
          <span className="text-xs font-normal opacity-90">What can I make?</span>
        </Button>

        <button
          type="button"
          onClick={onBrowse}
          className="text-sm font-semibold text-content-muted hover:text-content min-h-[44px] font-bengali"
        >
          অথবা রেসিপি খুঁজুন · Or browse recipes
        </button>
      </m.div>

      {isFeedbackConfigured && addRecipeUrl && (
        <m.a
          variants={blurFadeUp}
          href={addRecipeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onAddRecipe}
          className="z-card p-3.5 flex items-center justify-between text-left"
        >
          <span>
            <span className="block text-sm font-bold font-bengali">আপনার প্রিয় রেসিপি নেই?</span>
            <span className="block text-xs text-content-muted">Can't find your favourite recipe?</span>
          </span>
          <span className="text-xs font-semibold text-brand shrink-0 ml-2 font-bengali">আপনিই যোগ করুন →</span>
        </m.a>
      )}
    </div>
  );
}
