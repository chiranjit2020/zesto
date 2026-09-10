import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './ui/Icon';

export function PageHeader({
  icon,
  iconMotion,
  title,
  sub,
  onBack,
}: {
  icon?: IconName;
  iconMotion?: 'pop' | 'spin' | 'swing' | 'pulse' | 'breathe' | 'tumble';
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
      <h1 className="group text-2xl font-bold flex items-center gap-2 text-balance">
        {icon && <Icon name={icon} size={24} strokeWidth={2.2} motion={iconMotion} className="text-brand shrink-0" />}
        {title}
      </h1>
      {sub && <p className="text-sm text-content-muted mt-1">{sub}</p>}
    </div>
  );
}
