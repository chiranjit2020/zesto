import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Guided cooking session (§24). Survives an accidental reload — you're mid-cook. */
interface CookStore {
  recipeNumber: number | null;
  step: number;
  startedAt: string | null;
  completedSteps: number[];
  begin: (recipeNumber: number) => void;
  goto: (step: number) => void;
  next: (total: number) => void;
  prev: () => void;
  markDone: (step: number) => void;
  end: () => void;
}

export const useCook = create<CookStore>()(
  persist(
    (set) => ({
      recipeNumber: null,
      step: 0,
      startedAt: null,
      completedSteps: [],
      begin: (recipeNumber) =>
        set({ recipeNumber, step: 0, startedAt: new Date().toISOString(), completedSteps: [] }),
      goto: (step) => set({ step: Math.max(0, step) }),
      next: (total) =>
        set((s) => ({
          step: Math.min(total - 1, s.step + 1),
          completedSteps: [...new Set([...s.completedSteps, s.step])],
        })),
      prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      markDone: (step) => set((s) => ({ completedSteps: [...new Set([...s.completedSteps, step])] })),
      end: () => set({ recipeNumber: null, step: 0, startedAt: null, completedSteps: [] }),
    }),
    { name: 'zesto.cook.v1' },
  ),
);
