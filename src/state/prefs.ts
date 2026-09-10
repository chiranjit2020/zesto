import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Diet, EffortLevel, EquipmentId, Preferences } from '../domain/types';

interface PrefsStore extends Preferences {
  hasOnboarded: boolean;
  set: (patch: Partial<Preferences & { hasOnboarded: boolean }>) => void;
  toggleEquipment: (e: EquipmentId) => void;
  toggleLikedTag: (t: string) => void;
  reset: () => void;
}

const DEFAULTS: Preferences & { hasOnboarded: boolean } = {
  diet: 'any',
  equipmentOwned: ['one-pan'],
  defaultBudgetInr: null,
  defaultTimeMinutes: null,
  defaultMaxEffort: null,
  servings: 1,
  theme: 'system',
  likedTags: [],
  hasOnboarded: false,
};

export const usePrefs = create<PrefsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      toggleEquipment: (e) =>
        set((s) => ({
          equipmentOwned: s.equipmentOwned.includes(e)
            ? s.equipmentOwned.filter((x) => x !== e)
            : [...s.equipmentOwned, e],
        })),
      toggleLikedTag: (t) =>
        set((s) => ({
          likedTags: s.likedTags.includes(t)
            ? s.likedTags.filter((x) => x !== t)
            : [...s.likedTags, t],
        })),
      reset: () => set(DEFAULTS),
    }),
    { name: 'zesto.prefs.v1' },
  ),
);

export const DIETS: { id: Diet; label: string }[] = [
  { id: 'any', label: 'No preference' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'egg', label: 'Egg is fine' },
];

export const EQUIPMENT_OPTIONS: { id: EquipmentId; label: string; emoji: string }[] = [
  { id: 'no-cook', label: 'No cooking', emoji: '🥣' },
  { id: 'kettle', label: 'Kettle', emoji: '🫖' },
  { id: 'microwave', label: 'Microwave', emoji: '📻' },
  { id: 'one-pan', label: 'One pan', emoji: '🍳' },
  { id: 'one-pot', label: 'One pot', emoji: '🍲' },
  { id: 'tawa', label: 'Tawa', emoji: '🫓' },
  { id: 'rice-cooker', label: 'Rice cooker', emoji: '🍚' },
];

export const EFFORT_OPTIONS: { id: EffortLevel; label: string }[] = [
  { id: 'very-low', label: 'Very low' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];
