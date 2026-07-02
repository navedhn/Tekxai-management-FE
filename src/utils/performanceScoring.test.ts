import { describe, expect, it } from 'vitest';
import {
  calculateTotalScore,
  findBonusTier,
  SCORING_CRITERIA,
  EMPTY_SCORES,
} from './performanceScoring';
import type { BonusTier } from '@/types/performanceScoring';

const TEST_TIERS: BonusTier[] = [
  { id: '1', level_name: 'Outstanding',        min_score: 95, max_score: 100, bonus_amount: 20_000 },
  { id: '2', level_name: 'Excellent',          min_score: 85, max_score: 94,  bonus_amount: 15_000 },
  { id: '3', level_name: 'Good',               min_score: 75, max_score: 84,  bonus_amount: 10_000 },
  { id: '4', level_name: 'Average',            min_score: 50, max_score: 74,  bonus_amount: 5_000 },
  { id: '5', level_name: 'Needs Improvement',  min_score: 0,  max_score: 49,  bonus_amount: -5_000 },
];

describe('performanceScoring', () => {
  it('sums category scores to 100 max', () => {
    const total = calculateTotalScore(
      {
        quality_score: 30,
        timely_delivery: 30,
        regularity: 15,
        punctuality: 15,
        dress_code: 10,
      },
      SCORING_CRITERIA
    );
    expect(total).toBe(100);
  });

  it('applies bonus tiers', () => {
    expect(findBonusTier(95, TEST_TIERS)?.bonus_amount).toBe(20_000);
    expect(findBonusTier(85, TEST_TIERS)?.bonus_amount).toBe(15_000);
    expect(findBonusTier(75, TEST_TIERS)?.bonus_amount).toBe(10_000);
    expect(findBonusTier(65, TEST_TIERS)?.bonus_amount).toBe(5_000);
    expect(findBonusTier(45, TEST_TIERS)?.bonus_amount).toBe(-5_000);
  });

  it('starts from empty scores at zero', () => {
    expect(calculateTotalScore(EMPTY_SCORES, SCORING_CRITERIA)).toBe(0);
    expect(findBonusTier(0, TEST_TIERS)?.bonus_amount).toBe(-5_000);
  });
});
