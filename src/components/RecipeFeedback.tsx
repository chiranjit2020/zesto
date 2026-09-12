import { useState } from 'react';
import { Icon } from './ui/Icon';
import { useNotifications } from '../state/notifications';
import { submitRecipeFeedback } from '../lib/feedback/api';
import { track } from '../lib/track';

const REASONS: { key: string; label: string }[] = [
  { key: 'ingredients_unavailable', label: "Ingredients unavailable" },
  { key: 'cost_wrong', label: 'Cost seems wrong' },
  { key: 'time_wrong', label: 'Cooking time seems wrong' },
  { key: 'instructions_unclear', label: 'Instructions unclear' },
  { key: 'didnt_work', label: "Recipe didn't work" },
  { key: 'portion_issue', label: 'Portion/serving issue' },
  { key: 'other', label: 'Other' },
];

/**
 * "Was this recipe useful?" (docs/ANALYTICS_FEEDBACK_PLAN.md §13) — lives on
 * `CookMode.tsx`'s completion screen, after cooking is already done, never mid-steps
 * (spec §13: "do not interrupt the cooking experience"). Entirely optional at every
 * step: 👍 submits immediately with no reason required; 👎 offers reasons but a "skip"
 * escape hatch submits with none rather than forcing a choice (spec: "do not force the
 * user to provide feedback").
 *
 * Reuses the same anonymous device id notifications already established
 * (`useNotifications`'s `deviceId`) rather than inventing a second identity system —
 * this is app-local, own-device feedback, not tied to any account.
 */
export function RecipeFeedback({ recipeNumber }: { recipeNumber: number }) {
  const deviceId = useNotifications((s) => s.deviceId);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [done, setDone] = useState(false);

  const submit = (r: 'up' | 'down', reason: string | null) => {
    track('recipe_feedback_submitted', { recipe_number: recipeNumber, rating: r, reason });
    void submitRecipeFeedback(deviceId, recipeNumber, r, reason);
    setDone(true);
  };

  if (done) {
    return <p className="text-xs text-content-faint mt-5 pt-4 border-t border-line">Thanks for the feedback 🙏</p>;
  }

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <p className="text-sm font-semibold mb-2">Was this recipe useful?</p>
      {rating !== 'down' ? (
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => submit('up', null)}
            aria-label="Yes, useful"
            className="z-tap grid place-items-center rounded-full border border-line p-2.5 hover:border-positive hover:text-positive"
          >
            <Icon name="thumb-up" size={20} />
          </button>
          <button
            onClick={() => setRating('down')}
            aria-label="No, not useful"
            className="z-tap grid place-items-center rounded-full border border-line p-2.5 hover:border-critical hover:text-critical"
          >
            <Icon name="thumb-down" size={20} />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {REASONS.map((r) => (
              <button key={r.key} onClick={() => submit('down', r.key)} className="z-chip !py-1.5">
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => submit('down', null)} className="text-2xs text-content-faint mt-2.5 underline block mx-auto">
            skip, just leave the rating
          </button>
        </div>
      )}
    </div>
  );
}
