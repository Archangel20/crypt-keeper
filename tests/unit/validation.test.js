import { describe, it, expect } from 'vitest';
import { validateName, validateCardText, validateNotes } from '../../src/logic/validation.js';

describe('validateName', () => {
  it('trims and accepts 1..100 chars', () => {
    expect(validateName('  Bats  ')).toEqual({ ok: true, value: 'Bats' });
    expect(validateName('a'.repeat(100)).ok).toBe(true);
  });
  it('rejects empty, whitespace, too long and non-strings', () => {
    for (const v of ['', '   ', 'a'.repeat(101), null, undefined, 5]) {
      const r = validateName(v);
      expect(r.ok).toBe(false);
      expect(r.field).toBe('name');
    }
  });
});

describe('validateCardText', () => {
  it('accepts 1..500 trimmed chars', () => {
    expect(validateCardText(' hi ', 'back')).toEqual({ ok: true, value: 'hi' });
    expect(validateCardText('a'.repeat(500)).ok).toBe(true);
  });
  it('rejects invalid input and names the field', () => {
    const r = validateCardText('a'.repeat(501), 'back');
    expect(r.ok).toBe(false);
    expect(r.field).toBe('back');
    expect(validateCardText('  ', 'front').ok).toBe(false);
    expect(validateCardText(undefined).ok).toBe(false);
  });
});

describe('validateNotes', () => {
  it('accepts 200..12000 chars', () => {
    expect(validateNotes('a'.repeat(200)).ok).toBe(true);
    expect(validateNotes('a'.repeat(12000)).ok).toBe(true);
  });
  it('rejects out of range with count and limit in message', () => {
    const short = validateNotes('a'.repeat(199));
    expect(short.ok).toBe(false);
    expect(short.message).toContain('199');
    expect(short.message).toContain('200');
    const long = validateNotes('a'.repeat(12001));
    expect(long.ok).toBe(false);
    expect(long.message).toContain('12001');
    expect(long.message).toContain('12000');
  });
  it('rejects non-strings without throwing', () => {
    expect(validateNotes(null).ok).toBe(false);
  });
});
