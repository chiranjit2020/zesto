import { describe, expect, it } from 'vitest';
import { weeklySummaryTemplate } from './weeklySummary';
import type { WeekStats } from './kitchenHistory';

const baseStats: WeekStats = {
  mealsCooked: 5,
  estCalories: 1920,
  moneySpentInr: 184,
  avgMealInr: 36.8,
  leftoversRescued: 3,
  deliveryAvoided: 4,
  estimatedSavedInr: 126,
  under30Count: 2,
  insights: [],
};

describe('weeklySummaryTemplate', () => {
  it('returns null for a week with nothing cooked — no fabricated celebration', () => {
    expect(weeklySummaryTemplate({ ...baseStats, mealsCooked: 0 })).toBeNull();
  });

  it('renders spec §21\'s example shape from real WeekStats', () => {
    const result = weeklySummaryTemplate(baseStats);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Your week with Zesto 🍳');
    expect(result!.body).toContain('5 meals cooked');
    expect(result!.body).toContain('₹184 estimated spend');
    expect(result!.body).toContain('1,920 estimated kcal');
    expect(result!.body).toContain('3 pantry ingredients rescued');
    expect(result!.body).toContain('₹126 estimated savings');
  });

  it('omits zero-valued optional metrics rather than showing "0"', () => {
    const result = weeklySummaryTemplate({
      ...baseStats,
      estCalories: 0,
      leftoversRescued: 0,
      estimatedSavedInr: 0,
    });
    expect(result!.body).toBe('5 meals cooked · ₹184 estimated spend');
  });

  it('uses singular phrasing for a single meal/rescue', () => {
    const result = weeklySummaryTemplate({ ...baseStats, mealsCooked: 1, leftoversRescued: 1 });
    expect(result!.body).toContain('1 meal cooked');
    expect(result!.body).toContain('1 pantry ingredient rescued');
  });
});
