import { describe, it, expect } from 'vitest';
import {
  parseMinutes, formatMMSS, defaultSettings,
  start, pause, reset, tick, isFinished, completeSession, applyLengthChange,
} from '../../src/logic/timer.js';

describe('defaultSettings', () => {
  it('is 25 study / 5 break', () => {
    expect(defaultSettings).toEqual({ studyMinutes: 25, breakMinutes: 5 });
  });
});

describe('parseMinutes', () => {
  it('accepts boundaries', () => {
    expect(parseMinutes(1, 'study')).toEqual({ ok: true, value: 1 });
    expect(parseMinutes('120', 'study')).toEqual({ ok: true, value: 120 });
    expect(parseMinutes(60, 'break')).toEqual({ ok: true, value: 60 });
  });

  it('rejects out of range, fractional, empty and non-numeric', () => {
    for (const bad of [0, 121, 1.5, '', 'abc', null, undefined, NaN, -3]) {
      const r = parseMinutes(bad, 'study');
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/1 to 120/);
    }
    const b = parseMinutes(61, 'break');
    expect(b.ok).toBe(false);
    expect(b.message).toMatch(/1 to 60/);
  });
});

describe('formatMMSS', () => {
  it('formats and rounds up to the next second', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(1)).toBe('00:01');
    expect(formatMMSS(59001)).toBe('01:00');
    expect(formatMMSS(25 * 60 * 1000)).toBe('25:00');
    expect(formatMMSS(120 * 60 * 1000)).toBe('120:00');
  });
});

describe('timer state transitions', () => {
  const settings = { studyMinutes: 25, breakMinutes: 5 };
  const idle = { mode: 'study', status: 'idle', remainingMs: 1500000, endTimestamp: null };

  it('start sets endTimestamp = now + remainingMs', () => {
    const s = start(idle, 1000);
    expect(s).toEqual({ mode: 'study', status: 'running', remainingMs: 1500000, endTimestamp: 1501000 });
    expect(idle.status).toBe('idle');
  });

  it('tick derives remaining from endTimestamp, even after a large gap', () => {
    const s = start(idle, 0);
    expect(tick(s, 10000).remainingMs).toBe(1490000);
    expect(tick(s, 99999999).remainingMs).toBe(0);
  });

  it('tick leaves non-running states alone', () => {
    expect(tick(idle, 5000)).toEqual(idle);
  });

  it('pause then start preserves remaining time', () => {
    const paused = pause(start(idle, 0), 60000);
    expect(paused).toEqual({ mode: 'study', status: 'paused', remainingMs: 1440000, endTimestamp: null });
    const resumed = start(paused, 100000);
    expect(resumed.remainingMs).toBe(1440000);
    expect(resumed.endTimestamp).toBe(1540000);
  });

  it('isFinished only when running at zero', () => {
    const s = start(idle, 0);
    expect(isFinished(s)).toBe(false);
    expect(isFinished(tick(s, 1500000))).toBe(true);
    expect(isFinished({ ...idle, remainingMs: 0 })).toBe(false);
  });

  it('reset returns idle at full length of current mode', () => {
    const s = reset({ mode: 'break', status: 'paused', remainingMs: 1, endTimestamp: null }, settings);
    expect(s).toEqual({ mode: 'break', status: 'idle', remainingMs: 300000, endTimestamp: null });
  });

  it('completeSession switches mode at full length, idle', () => {
    expect(completeSession(idle, settings)).toEqual({ mode: 'break', status: 'idle', remainingMs: 300000, endTimestamp: null });
    expect(completeSession({ ...idle, mode: 'break' }, settings).remainingMs).toBe(1500000);
  });

  it('applyLengthChange updates when not running, ignores when running', () => {
    const next = { studyMinutes: 30, breakMinutes: 10 };
    expect(applyLengthChange(idle, next).remainingMs).toBe(1800000);
    const running = start(idle, 0);
    expect(applyLengthChange(running, next)).toEqual(running);
  });

  it('never throws on bad input', () => {
    expect(() => tick(undefined, NaN)).not.toThrow();
    expect(() => reset(null, null)).not.toThrow();
    expect(reset(null, null).remainingMs).toBe(1500000);
  });
});
