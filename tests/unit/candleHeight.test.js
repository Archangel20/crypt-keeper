import { describe, it, expect } from 'vitest';
import { candleHeightPercent } from '../../src/logic/candleHeight.js';

describe('candleHeightPercent', () => {
  it('returns 100 when remaining equals total and 0 when remaining is 0', () => {
    expect(candleHeightPercent(1000, 1000)).toBe(100);
    expect(candleHeightPercent(0, 1000)).toBe(0);
  });

  it('computes the proportion', () => {
    expect(candleHeightPercent(400, 1000)).toBe(40);
  });

  it('clamps to 0..100', () => {
    expect(candleHeightPercent(-5, 1000)).toBe(0);
    expect(candleHeightPercent(5000, 1000)).toBe(100);
  });

  it('returns 100 for invalid totals', () => {
    for (const total of [0, -1, NaN, Infinity, undefined, null, '10']) {
      expect(candleHeightPercent(500, total)).toBe(100);
    }
  });

  it('treats non-finite remaining as 0', () => {
    expect(candleHeightPercent(NaN, 1000)).toBe(0);
    expect(candleHeightPercent(undefined, 1000)).toBe(0);
  });
});
