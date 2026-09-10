import { useNavigate } from 'react-router-dom';

export function PageHeader({
  emoji,
  title,
  sub,
  onBack,
}: {
  emoji?: string;
  title: string;
  sub?: string;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div>
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        className="text-sm font-semibold text-content-muted hover:text-content -ml-1 mb-2"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold flex items-center gap-2 text-balance">
        {emoji && <span aria-hidden>{emoji}</span>}
        {title}
      </h1>
      {sub && <p className="text-sm text-content-muted mt-1">{sub}</p>}
    </div>
  );
}
