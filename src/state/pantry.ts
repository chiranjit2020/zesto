import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PantryItem } from '../domain/types';
import { INGREDIENT_BY_ID } from '../data/catalog';
export { pantryContextIds, expiringSoon } from '../domain/pantry';

interface PantryStore {
  items: PantryItem[];
  add: (ingredientId: string, patch?: Partial<PantryItem>) => void;
  update: (id: string, patch: Partial<PantryItem>) => void;
  remove: (id: string) => void;
  has: (ingredientId: string) => boolean;
  clear: () => void;
}

const uid = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const usePantry = create<PantryStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (ingredientId, patch) =>
        set((s) => {
          if (s.items.some((i) => i.ingredientId === ingredientId)) return s;
          const ing = INGREDIENT_BY_ID.get(ingredientId);
          const expiry =
            patch?.expiry ??
            (ing?.shelfLifeDays
              ? new Date(Date.now() + ing.shelfLifeDays * 86400000).toISOString().slice(0, 10)
              : null);
          return {
            items: [
              ...s.items,
              {
                id: uid(),
                ingredientId,
                quantity: patch?.quantity ?? null,
                unit: patch?.unit ?? null,
                expiry,
                estValueInr: patch?.estValueInr ?? null,
                addedAt: new Date().toISOString(),
              },
            ],
          };
        }),
      update: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      has: (ingredientId) => get().items.some((i) => i.ingredientId === ingredientId),
      clear: () => set({ items: [] }),
    }),
    { name: 'zesto.pantry.v1' },
  ),
);
