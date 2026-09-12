import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealHistoryEntry } from '../domain/types';
export { recentlyCookedNumbers, computeWeekStats, type WeekStats } from '../domain/kitchenHistory';

interface KitchenStore {
  history: MealHistoryEntry[];
  favorites: number[];
  logCook: (entry: Omit<MealHistoryEntry, 'id' | 'cookedAt'> & { cookedAt?: string }) => void;
  removeHistory: (id: string) => void;
  toggleFavorite: (recipeNumber: number) => void;
  isFavorite: (recipeNumber: number) => boolean;
  clear: () => void;
}

const uid = () => `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const useKitchen = create<KitchenStore>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],
      logCook: (entry) =>
        set((s) => ({
          history: [
            { id: uid(), cookedAt: entry.cookedAt ?? new Date().toISOString(), ...entry },
            ...s.history,
          ].slice(0, 400),
        })),
      removeHistory: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      toggleFavorite: (n) =>
        set((s) => ({
          favorites: s.favorites.includes(n)
            ? s.favorites.filter((x) => x !== n)
            : [n, ...s.favorites],
        })),
      isFavorite: (n) => get().favorites.includes(n),
      clear: () => set({ history: [], favorites: [] }),
    }),
    { name: 'zesto.kitchen.v1' },
  ),
);

export function cookingStreakDays(history: MealHistoryEntry[], now = Date.now()): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => new Date(h.cookedAt).toISOString().slice(0, 10)));
  let streak = 0;
  for (let d = 0; d < 400; d++) {
    const key = new Date(now - d * 86400000).toISOString().slice(0, 10);
    if (days.has(key)) streak += 1;
    else if (d > 0) break;
  }
  return streak;
}

