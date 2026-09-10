import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { RECIPE_BY_SLUG } from '../data/catalog';
import { useCook } from '../state/cook';
import { useKitchen } from '../state/kitchen';
import { usePrefs } from '../state/prefs';
import { useWakeLock, useCountdown } from '../lib/hooks';
import { timerSecondsFromStep } from '../lib/format';
import { ZMark } from '../components/ui/ZMark';
import { Button } from '../components/ui/Button';
import { RecipeMeta } from '../components/RecipeMeta';
import { costView } from '../domain/cost';

export function CookMode() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const recipe = slug ? RECIPE_BY_SLUG.get(slug) : undefined;
  const cook = useCook();
  const servings = usePrefs((s) => s.servings);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finished, setFinished] = useState(false);
  const timer = useCountdown();

  useWakeLock(!!recipe && !finished);

  useEffect(() => {
    if (recipe && cook.recipeNumber !== recipe.number) cook.begin(recipe.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.number]);

  const stepSeconds = useMemo(
    () => (recipe ? timerSecondsFromStep(recipe.steps[cook.step] ?? '') : null),
    [recipe, cook.step],
  );

  if (!recipe) return <Navigate to="/discover" replace />;

  const total = recipe.steps.length;
  const isLast = cook.step >= total - 1;
  const progress = (cook.step + (isLast ? 1 : 0)) / total;

  if (finished) {
    return <CookComplete recipe={recipe} servings={servings} onClose={() => { cook.end(); navigate(`/r/${recipe.slug}`); }} />;
  }

  return (
    <div className="fixed inset-0 bg-surface flex flex-col z-40" data-surface="midnight">
      <header className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-line">
        <button
          onClick={() => setConfirmExit(true)}
          className="z-tap text-content-muted text-sm font-semibold"
          aria-label="Exit cooking mode"
        >
          ✕
        </button>
        <div className="flex-1">
          <div className="text-xs font-bold truncate">{recipe.title}</div>
          <div className="h-1 mt-1 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className="h-full grad-brand transition-all duration-500 ease-zesto"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <ZMark size={30} progress={progress} title="" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col">
        <div className="text-sm font-bold text-brand mb-4">
          Step {cook.step + 1} of {total}
        </div>
        <p className="text-2xl leading-relaxed font-semibold text-balance">
          {recipe.steps[cook.step]}
        </p>

        {stepSeconds && (
          <div className="mt-8">
            {timer.running ? (
              <div className="z-card p-5 text-center">
                <div className="z-stat-num text-4xl tabular-nums">
                  {Math.floor(timer.remaining / 60)}:{String(timer.remaining % 60).padStart(2, '0')}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={timer.stop}>Stop timer</Button>
              </div>
            ) : timer.remaining === 0 && !timer.running ? (
              <Button variant="warm" onClick={() => timer.start(stepSeconds)}>
                ⏱ Start {Math.round(stepSeconds / 60) || 1}-min timer
              </Button>
            ) : (
              <div className="text-positive font-bold text-center">⏱ Timer done — carry on</div>
            )}
          </div>
        )}
      </div>

      <footer className="p-4 border-t border-line pb-safe flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => { timer.stop(); cook.prev(); }}
          disabled={cook.step === 0}
        >
          ← Back
        </Button>
        {isLast ? (
          <Button variant="warm" size="lg" block onClick={() => { timer.stop(); setFinished(true); }}>
            I'm done cooking 🎉
          </Button>
        ) : (
          <Button size="lg" block onClick={() => { timer.stop(); cook.next(total); }}>
            Done — next →
          </Button>
        )}
      </footer>

      {confirmExit && (
        <div className="absolute inset-0 bg-ink/60 grid place-items-center p-6 z-10">
          <div className="z-card p-5 max-w-xs text-center">
            <h2 className="font-bold text-lg">Leave cooking mode?</h2>
            <p className="text-sm text-content-muted mt-1">Your progress is saved — you can pick up where you left off.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" block onClick={() => setConfirmExit(false)}>Keep cooking</Button>
              <Button variant="danger" block onClick={() => navigate(`/r/${recipe.slug}`)}>Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CookComplete({
  recipe,
  servings,
  onClose,
}: {
  recipe: ReturnType<typeof RECIPE_BY_SLUG.get> & object;
  servings: number;
  onClose: () => void;
}) {
  const logCook = useKitchen((s) => s.logCook);
  const [logged, setLogged] = useState(false);
  const [leftoverRescue, setLeftoverRescue] = useState(recipe.tags.includes('uses-leftovers'));
  const [deliveryAvoided, setDeliveryAvoided] = useState(true);
  const cost = costView(recipe, servings);

  const finish = () => {
    logCook({
      recipeNumber: recipe.number,
      servings,
      actualCostInr: cost.estimateInr,
      rating: null,
      wasLeftoverRescue: leftoverRescue,
      deliveryAvoided,
    });
    setLogged(true);
  };

  return (
    <div className="fixed inset-0 bg-surface z-40 grid place-items-center p-6" data-surface="midnight">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto w-fit"><ZMark size={72} progress={1} /></div>
        <h1 className="text-2xl font-bold mt-4">Nice. You made it.</h1>
        <h2 className="text-lg z-gradient-text font-bold">{recipe.title}</h2>
        <div className="mt-2 flex justify-center"><RecipeMeta recipe={recipe} size="sm" /></div>

        {!logged ? (
          <div className="mt-6 space-y-3 text-left">
            <label className="flex items-center gap-3 z-card p-3 text-sm">
              <input type="checkbox" checked={deliveryAvoided} onChange={(e) => setDeliveryAvoided(e.target.checked)} className="accent-[rgb(var(--z-brand))] w-4 h-4" />
              This replaced a delivery order
            </label>
            <label className="flex items-center gap-3 z-card p-3 text-sm">
              <input type="checkbox" checked={leftoverRescue} onChange={(e) => setLeftoverRescue(e.target.checked)} className="accent-[rgb(var(--z-brand))] w-4 h-4" />
              I rescued a leftover with this
            </label>
            <Button block size="lg" onClick={finish}>Log it to my week</Button>
            <Button variant="ghost" block onClick={onClose}>Skip</Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-positive font-bold">
              Logged · ₹{cost.estimateInr} spent
              {deliveryAvoided && ` · ~₹${Math.max(0, 235 - cost.estimateInr)} saved vs ordering`}
            </p>
            <Button block onClick={() => share(recipe.title, recipe.slug, cost.estimateInr)}>
              Share what I made
            </Button>
            <Button variant="ghost" block onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

async function share(title: string, slug: string, cost?: number) {
  const url = `${location.origin}/r/${slug}`;
  const text = cost ? `I made ${title} for ₹${cost} 🍳 #Zesto` : `I made ${title} #Zesto`;
  try {
    if (navigator.share) await navigator.share({ title: `Zesto · ${title}`, text, url });
    else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert('Copied — paste it anywhere');
    }
  } catch {
    /* cancelled */
  }
}
