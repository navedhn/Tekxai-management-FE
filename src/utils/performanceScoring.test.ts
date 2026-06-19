import { describe, expect, it } from 'vitest';
import {
  calculateSuggestedBonus,
  calculateTotalScore,
  DEFAULT_BONUS_RULES,
  DEFAULT_SCORING_CRITERIA,
  EMPTY_SCORES,
} from './performanceScoring';

describe('performanceScoring', () => {
  it('sums category scores to 100 max', () => {
    const total = calculateTotalScore(
      {
        qualityAssurance: 30,
        projectDelivery: 30,
        punctualityAttendance: 20,
        teamCollaboration: 10,
        dressCode: 10,
      },
      DEFAULT_SCORING_CRITERIA
    );
    expect(total).toBe(100);
  });

  it('applies bonus tiers', () => {
    expect(calculateSuggestedBonus(95, DEFAULT_BONUS_RULES)).toBe(20_000);
    expect(calculateSuggestedBonus(85, DEFAULT_BONUS_RULES)).toBe(15_000);
    expect(calculateSuggestedBonus(75, DEFAULT_BONUS_RULES)).toBe(10_000);
    expect(calculateSuggestedBonus(65, DEFAULT_BONUS_RULES)).toBe(5_000);
    expect(calculateSuggestedBonus(55, DEFAULT_BONUS_RULES)).toBe(5_000);
    expect(calculateSuggestedBonus(45, DEFAULT_BONUS_RULES)).toBe(0);
    expect(calculateSuggestedBonus(35, DEFAULT_BONUS_RULES)).toBe(-5_000);
  });

  it('starts from empty scores at zero', () => {
    expect(calculateTotalScore(EMPTY_SCORES, DEFAULT_SCORING_CRITERIA)).toBe(0);
    expect(calculateSuggestedBonus(0, DEFAULT_BONUS_RULES)).toBe(-5_000);
  });
});
