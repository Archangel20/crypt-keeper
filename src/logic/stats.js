// Soul points, streak and today's progress. Pure, never throws, never reads the clock.

import { defaultStats, isValidStats } from './storageCodec.js';

const MS_PER_DAY = 86400000;

/**
 * Local calendar day key "YYYY-MM-DD" for a Date.
 * @param {Date} date
 * @returns {string}
 */
export function dayKey(date) {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Whole calendar days from A to B (B - A), computed from UTC date parts so
 * daylight saving changes cannot skew the result. Returns NaN for bad keys.
 * @param {string} dayKeyA
 * @param {string} dayKeyB
 * @returns {number}
 */
export function daysBetween(dayKeyA, dayKeyB) {
  const parse = (k) => {
    const m = typeof k === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(k) : null;
    if (!m) return NaN;
    const d = new Date(0);
    d.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  };
  const a = parse(dayKeyA);
  const b = parse(dayKeyB);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Roll Today_Progress to 0 when the stored day differs from today, and reset
 * the streak to 0 when more than one day has passed since the last study day.
 * Invalid stats fall back to defaults. Idempotent.
 * @param {import('./storageCodec.js').Stats} stats
 * @param {string} todayKey
 * @returns {import('./storageCodec.js').Stats}
 */
export function normalizeStats(stats, todayKey) {
  const base = isValidStats(stats) ? stats : defaultStats;
  let next = { ...base };
  if (base.todayDay !== todayKey) {
    next = { ...next, todayDay: todayKey, todaySessions: 0, todayMinutes: 0 };
  }
  if (base.lastStudyDay !== null && daysBetween(base.lastStudyDay, todayKey) > 1) {
    next = { ...next, streak: 0 };
  }
  return next;
}

/**
 * Record a completed study session: +1 soul point, progress, and streak rules.
 * @param {import('./storageCodec.js').Stats} stats
 * @param {number} minutes whole minutes of the finished session
 * @param {string} todayKey
 * @returns {import('./storageCodec.js').Stats}
 */
export function recordStudySession(stats, minutes, todayKey) {
  const s = normalizeStats(stats, todayKey);
  const mins = Number.isInteger(minutes) && minutes > 0 ? minutes : 0;
  let streak = s.streak;
  if (s.lastStudyDay === null || s.streak === 0) {
    streak = 1;
  } else {
    const gap = daysBetween(s.lastStudyDay, todayKey);
    if (gap === 1) streak = s.streak + 1;
    else if (gap > 1) streak = 1;
    // gap === 0 (or clock moved back): unchanged
  }
  return {
    ...s,
    soulPoints: s.soulPoints + 1,
    streak,
    lastStudyDay: todayKey,
    todayDay: todayKey,
    todaySessions: s.todaySessions + 1,
    todayMinutes: s.todayMinutes + mins,
  };
}
