export const rupee = (n: number) => `₹${Math.round(n)}`;

export const rupee2 = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const kcal = (n: number) => `~${n} kcal`;

export const minutes = (n: number) => `${n} min`;

export function equipmentLabel(id: string): string {
  return (
    {
      'no-cook': 'No cooking',
      kettle: 'Kettle',
      microwave: 'Microwave',
      'one-pan': '1 pan',
      'one-pot': '1 pot',
      tawa: 'Tawa',
      'rice-cooker': 'Rice cooker',
    } as Record<string, string>
  )[id] ?? id;
}

export function effortLabel(level: string): string {
  return (
    {
      'very-low': 'Very low effort',
      low: 'Low effort',
      medium: 'Medium effort',
      high: 'High effort',
    } as Record<string, string>
  )[level] ?? level;
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** parse a "12 min", "boil for 4 minutes", "set a timer for 4 minutes" step → seconds */
export function timerSecondsFromStep(step: string): number | null {
  const m = step.match(/(\d+)\s*(?:full\s*)?(minute|min)\b/i);
  if (m) return parseInt(m[1], 10) * 60;
  const s = step.match(/(\d+)\s*seconds?\b/i);
  if (s && parseInt(s[1], 10) >= 20) return parseInt(s[1], 10);
  return null;
}
