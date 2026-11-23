// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  splitSentences,
  extractKeyTerms,
  generateFallbackQuiz,
  BLANK,
} from '../../src/logic/fallbackGenerator.js';
import { isValidQuiz } from '../../src/logic/quiz.js';

const NOTES = [
  'Mitochondria produce energy for the cell through respiration.',
  'The nucleus stores genetic information inside chromosomes.',
  'Ribosomes assemble proteins using instructions from messenger molecules.',
  'Chloroplasts capture sunlight to perform photosynthesis in plants.',
  'The membrane controls which substances enter or leave the cell.',
  'Lysosomes digest waste material using powerful enzymes inside vesicles.',
].join('\n');

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('splitSentences', () => {
  it('splits on punctuation and newlines and drops short sentences', () => {
    const r = splitSentences('Too short. This sentence has exactly six words!\nAnother fine sentence with enough words?');
    expect(r).toEqual([
      'This sentence has exactly six words',
      'Another fine sentence with enough words',
    ]);
  });
  it('returns [] for non-strings', () => {
    expect(splitSentences(null)).toEqual([]);
    expect(splitSentences(42)).toEqual([]);
  });
});

describe('extractKeyTerms', () => {
  it('keeps long alphabetic non-stop words, unique case-insensitively', () => {
    expect(extractKeyTerms('Cells divide; cells Divide because these mitosis steps happen 12345 times')).toEqual([
      'Cells',
      'divide',
      'mitosis',
      'steps',
      'happen',
      'times',
    ]);
  });
});

describe('generateFallbackQuiz', () => {
  it('produces a valid 5-question cloze quiz', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateFallbackQuiz(NOTES, seeded(seed));
      expect(r.ok).toBe(true);
      expect(isValidQuiz(r.questions)).toBe(true);
      for (const q of r.questions) {
        expect(q.text.split(BLANK).length).toBe(2);
        const answer = q.options[q.correctIndex];
        expect(NOTES.toLowerCase()).toContain(q.text.replace(BLANK, answer).toLowerCase());
      }
    }
  });

  it('works without an rng', () => {
    expect(isValidQuiz(generateFallbackQuiz(NOTES).questions)).toBe(true);
  });

  it('truncates nothing but rejects over-long sentences instead of emitting invalid text', () => {
    const long = ('alpha beta gamma delta epsilon ' + 'word '.repeat(80)).trim();
    const r = generateFallbackQuiz([long, long + ' x', NOTES].join('\n'), seeded(3));
    if (r.ok) expect(isValidQuiz(r.questions)).toBe(true);
  });

  it('returns not-enough-detail for short, empty or non-string notes', () => {
    for (const n of ['', '   ', 'Short note.', 'One two three four five six seven.', null, undefined, 7, {}]) {
      expect(generateFallbackQuiz(n, seeded(1))).toEqual({ ok: false, reason: 'not-enough-detail' });
    }
  });

  it('returns not-enough-detail with too few distinct key terms', () => {
    const thin = Array(6).fill('cat sat on the mat now').join('\n') + '\nthe dog ran far away now';
    expect(generateFallbackQuiz(thin, seeded(1)).ok).toBe(false);
  });
});
