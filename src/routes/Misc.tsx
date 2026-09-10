import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ButtonLink } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ZLockup } from '../components/ui/ZMark';
import { CATALOG_META } from '../data/catalog';

export function NotFound() {
  return (
    <div className="text-center py-20">
      <Icon name="cook" size={48} strokeWidth={1.5} className="mx-auto mb-4 text-content-faint" />
      <h1 className="text-2xl font-bold">Nothing cooking here</h1>
      <p className="text-sm text-content-muted mt-1 mb-6">That page doesn't exist.</p>
      <ButtonLink to="/">Back to Zesto</ButtonLink>
    </div>
  );
}

export function About() {
  return (
    <div className="space-y-4">
      <PageHeader title="About Zesto" />
      <div className="rounded-xl grad-night grid place-items-center py-10 px-6">
        <ZLockup height={92} />
      </div>
      <p className="text-sm text-content-muted leading-relaxed">
        Zesto turns a recipe collection into a decision engine. Tell it your situation —
        broke, tired, midnight, leftover rice, ₹30, ten minutes — and it tells you what you
        can eat, and why.
      </p>
      <div className="z-card p-4 text-sm space-y-2">
        <p><b>Content:</b> all {String(CATALOG_META.recipe_count)} recipes are from
          <i> "99 Recipes Under ₹99 — Quick, Cheap and Ridiculously Easy Meals"</i>, parsed into
          structured data. Nothing is invented.</p>
        <p><b>Costs</b> are estimated from the portion of each ingredient used, not shelf price.
          They move with your city, shop and season — a guide, not a guarantee.</p>
        <p><b>Calories</b> are a heuristic estimate from ingredient quantities (the book has no
          nutrition data). Low confidence — never treat them as medical-grade.</p>
        <p><b>Your data</b> — pantry, history, favorites — stays on this device.</p>
      </div>
      <Link to="/" className="block text-center text-xs font-semibold text-brand pt-2">← Home</Link>
    </div>
  );
}
