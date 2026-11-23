// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { dayKey, daysBetween, normalizeStats, recordStudySession } from '../../src/logic/stats.js';
import { defaultStats } from '../../src/logic/storageCodec.js';

const stats = (o = {}) => ({ ...defaultStats, ...o });

describe('dayKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});

describe('daysBetween', () => {
  it('handles month, year and leap boundaries', () => {
    expect(daysBetween('2024-01-31', '2024-02-01')).toBe(1);
    expect(daysBetween('2023-12-31', '2024-01-01')).toBe(1);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2024-03-10', '2024-03-10')).toBe(0);
    expect(daysBetween('2024-03-12', '2024-03-10')).toBe(-2);
  });
  it('returns NaN for bad keys', () => {
    expect(daysBetween('x', '2024-01-01')).toBeNaN();
  });
});

describe('normalizeStats', () => {
  it('rolls progress on a new day and keeps soul points', () => {
    const s = stats({ soulPoints: 3, streak: 2, lastStudyDay: '2024-05-01', todayDay: '2024-05-01', todaySessions: 2, todayMinutes: 50 });
    const n = normalizeStats(s, '2024-05-02');
    expect(n).toMatchObject({ soulPoints: 3, streak: 2, todayDay: '2024-05-02', todaySessions: 0, todayMinutes: 0 });
    expect(normalizeStats(n, '2024-05-02')).toEqual(n);
  });
  it('resets streak when gap > 1', () => {
    const s = stats({ streak: 4, lastStudyDay: '2024-05-01', todayDay: '2024-05-01' });
    expect(normalizeStats(s, '2024-05-03').streak).toBe(0);
  });
  it('falls back to defaults for invalid stats', () => {
    expect(normalizeStats(null, '2024-05-02')).toEqual({ ...defaultStats, todayDay: '2024-05-02' });
  });
});

describe('recordStudySession', () => {
  it('first session sets streak 1 and updates progress', () => {
    const r = recordStudySession(stats(), 25, '2024-05-02');
    expect(r).toEqual({ soulPoints: 1, streak: 1, lastStudyDay: '2024-05-02', todayDay: '2024-05-02', todaySessions: 1, todayMinutes: 25 });
  });
  it('streak table: gap 1 +1, gap 0 unchanged, gap >1 resets to 1', () => {
    const base = stats({ soulPoints: 5, streak: 3, lastStudyDay: '2024-05-01', todayDay: '2024-05-01' });
    expect(recordStudySession(base, 10, '2024-05-02').streak).toBe(4);
    expect(recordStudySession(base, 10, '2024-05-01').streak).toBe(3);
    expect(recordStudySession(base, 10, '2024-05-05').streak).toBe(1);
  });
  it('accumulates same-day progress', () => {
    const a = recordStudySession(stats(), 25, '2024-05-02');
    const b = recordStudySession(a, 10, '2024-05-02');
    expect(b).toMatchObject({ soulPoints: 2, todaySessions: 2, todayMinutes: 35, streak: 1 });
  });
});
