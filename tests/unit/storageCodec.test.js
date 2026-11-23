import { describe, it, expect } from 'vitest';
import {
  encode, decode, isValidSettings, isValidStats, isValidDecks,
  defaultSettings, defaultStats, defaultDecks,
} from '../../src/logic/storageCodec.js';

describe('storageCodec', () => {
  it('round-trips defaults', () => {
    for (const [d, v] of [[defaultSettings, isValidSettings], [defaultStats, isValidStats], [defaultDecks, isValidDecks]]) {
      const e = encode(d);
      expect(e.ok).toBe(true);
      expect(JSON.parse(e.text).version).toBe(1);
      expect(decode(e.text, v)).toEqual({ ok: true, data: d });
    }
  });
  it('rejects bad input without throwing', () => {
    expect(decode('{nope', isValidSettings).ok).toBe(false);
    expect(decode(null).ok).toBe(false);
    expect(decode('[]').reason).toBe('invalid-envelope');
    expect(decode(encode(defaultSettings, 2).text, isValidSettings).reason).toBe('unsupported-version');
    expect(decode(encode({ studyMinutes: 0, breakMinutes: 5 }).text, isValidSettings).reason).toBe('invalid-shape');
  });
  it('validates stats and decks', () => {
    expect(isValidStats({ ...defaultStats, lastStudyDay: '2024-02-30' })).toBe(false);
    expect(isValidStats({ ...defaultStats, lastStudyDay: '2024-02-29' })).toBe(true);
    expect(isValidDecks({ decks: [{ id: 'a', name: 'n', cards: [{ id: 'c', front: 'f', back: 'b', missCount: -1 }] }] })).toBe(false);
  });
  it('encode fails gracefully on circular data', () => {
    const a = {}; a.a = a;
    expect(encode(a).ok).toBe(false);
  });
});
