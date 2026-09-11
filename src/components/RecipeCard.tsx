import type { Recipe, ScoredRecipe } from '../domain/types';
import { RecipeMeta, recipeArt } from './RecipeMeta';
import { Badge } from './ui/primitives';
import { Icon } from './ui/Icon';
import { INGREDIENT_BY_ID } from '../data/catalog';
import { ZWatermark } from './ui/ZMark';
import { MotionLink, softSpring } from './ui/motion';

const cardReveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  whileTap: { scale: 0.975 },
};

export function RecipeCard({ recipe, footnote }: { recipe: Recipe; footnote?: string }) {
  return (
    <MotionLink
      {...cardReveal}
      to={`/r/${recipe.slug}`}
      className="z-card overflow-hidden flex flex-col"
    >
      <div className="h-20 relative" style={{ backgroundImage: recipeArt(recipe) }}>
        <div className="absolute inset-0 grid place-items-center">
          <ZWatermark size={44} />
        </div>
        {recipe.tags.includes('uses-leftovers') && (
          <span className="absolute top-2 left-2">
            <Badge tone="positive"><Icon name="reuse" size={11} /> leftovers</Badge>
          </span>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        <h3 className="font-bold leading-tight text-balance">{recipe.title}</h3>
        <RecipeMeta recipe={recipe} size="sm" showEstimate={false} />
        <p className="text-xs text-content-faint mt-auto pt-1">
          {footnote ?? recipe.tagline}
        </p>
      </div>
    </MotionLink>
  );
}

/** The recommendation result card — leads with WHY, then have/need (§10, §23). */
export function MatchCard({ scored, rank }: { scored: ScoredRecipe; rank?: number }) {
  const { recipe, reasons, haveIngredients, missingIngredients } = scored;
  const confidence = Math.round(scored.score * 100);
  const tone =
    scored.score >= 0.66 ? 'text-positive' : scored.score >= 0.4 ? 'text-caution' : 'text-content-muted';

  return (
    <MotionLink
      {...cardReveal}
      transition={softSpring}
      to={`/r/${recipe.slug}`}
      className="z-card p-4 block"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {rank === 0 && <Badge tone="brand">Best match</Badge>}
          <h3 className="text-lg font-bold leading-tight mt-1">{recipe.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className={`z-stat-num text-lg ${tone}`}>{confidence}%</div>
          <div className="text-2xs text-content-faint">match</div>
        </div>
      </div>

      <div className="mt-2">
        <RecipeMeta recipe={recipe} size="sm" />
      </div>

      <ConfidenceBar score={scored.score} />

      <ul className="mt-2.5 space-y-1">
        {reasons.map((r) => (
          <li key={r} className="text-sm text-content flex gap-1.5">
            <span className="text-positive" aria-hidden>✓</span>
            {r}
          </li>
        ))}
      </ul>

      {(haveIngredients.length > 0 || missingIngredients.length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-bold text-content-muted mb-1">You have</div>
            <div className="flex flex-wrap gap-1">
              {haveIngredients.map((id) => (
                <span key={id} className="text-positive">
                  ✓ {INGREDIENT_BY_ID.get(id)?.name ?? id}
                </span>
              ))}
              {haveIngredients.length === 0 && <span className="text-content-faint">—</span>}
            </div>
          </div>
          <div>
            <div className="font-bold text-content-muted mb-1">You need</div>
            <div className="flex flex-wrap gap-1">
              {missingIngredients.map((id) => (
                <span key={id} className="text-content-faint">
                  ○ {INGREDIENT_BY_ID.get(id)?.name ?? id}
                </span>
              ))}
              {missingIngredients.length === 0 && <span className="text-positive font-semibold">nothing — you're set</span>}
            </div>
          </div>
        </div>
      )}
    </MotionLink>
  );
}

export function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.66 ? 'rgb(var(--z-positive))' : score >= 0.4 ? 'rgb(var(--z-caution))' : 'rgb(var(--z-critical))';
  return (
    <div className="mt-2 h-1.5 rounded-full bg-surface-sunken overflow-hidden" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-500 ease-zesto" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
