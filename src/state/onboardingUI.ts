import { create } from 'zustand';

/**
 * Whether the first-use onboarding overlay (components/Onboarding.tsx) is being
 * replayed on demand (About → "How Zesto works"), as opposed to shown because
 * `usePrefs().hasOnboarded` is still false. Deliberately its own unpersisted store —
 * `usePrefs` is `persist`-backed, and this flag must never survive a reload.
 */
interface OnboardingUIStore {
  replaying: boolean;
  startReplay: () => void;
  endReplay: () => void;
}

export const useOnboardingUI = create<OnboardingUIStore>()((set) => ({
  replaying: false,
  startReplay: () => set({ replaying: true }),
  endReplay: () => set({ replaying: false }),
}));
