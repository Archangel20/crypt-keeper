// Offline fallback quiz generator (cloze questions). Pure, never throws, rng injected.
import { isValidQuiz, QUIZ_SIZE } from './quiz.js';

/** @typedef {import('./quiz.js').Question} Question */
/** @typedef {{ok:true, questions:Question[]} | {ok:false, reason:'not-enough-detail'}} FallbackResult */

export const BLANK = '_____';
const MIN_SENTENCE_WORDS = 6;
const MIN_TERM_LENGTH = 5;
const MAX_TERM_LENGTH = 40;
const MAX_TEXT = 300;

const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'also', 'among', 'because', 'been',
  'before', 'being', 'below', 'between', 'both', 'could', 'does', 'doing', 'down', 'during',
  'each', 'either', 'every', 'from', 'further', 'have', 'having', 'here', 'however', 'into',
  'itself', 'just', 'many', 'might', 'more', 'most', 'much', 'must', 'never', 'often', 'once',
  'only', 'other', 'others', 'ought', 'over', 'perhaps', 'rather', 'shall', 'should', 'since',
  'some', 'such', 'than', 'that', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they',
  'thing', 'things', 'this', 'those', 'though', 'through', 'thus', 'under', 'until', 'upon',
  'very', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'whom', 'whose', 'will',
  'with', 'within', 'without', 'would', 'your', 'yours', 'really', 'quite', 'still', 'usually',
]);

const WORD_RE = /\p{L}+/gu;

/**
 * Split notes into usable sentences (split on . ! ? and newlines, at least 6 words).
 * @param {unknown} notes
 * @returns {string[]}
 */
export function splitSentences(notes) {
  if (typeof notes !== 'string') return [];
  const out = [];
  const seen = new Set();
  for (const part of notes.split(/[.!?\r\n]+/)) {
    const s = part.trim().replace(/\s+/g, ' ');
    if (!s) continue;
    if (s.split(' ').length < MIN_SENTENCE_WORDS) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Key terms of a sentence: alphabetic words of length 5..40 not in the stop list,
 * unique case-insensitively (first spelling kept).
 * @param {unknown} sentence
 * @returns {string[]}
 */
export function extractKeyTerms(sentence) {
  if (typeof sentence !== 'string') return [];
  const out = [];
  const seen = new Set();
  for (const m of sentence.matchAll(WORD_RE)) {
    const w = m[0];
    const key = w.toLowerCase();
    if (w.length < MIN_TERM_LENGTH || w.length > MAX_TERM_LENGTH) continue;
    if (STOP_WORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/**
 * In-place-free Fisher-Yates shuffle driven by rng.
 * @template T
 * @param {T[]} arr
 * @param {() => number} next
 * @returns {T[]}
 */
function shuffle(arr, next) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let r = Number(next());
    if (!Number.isFinite(r) || r < 0 || r >= 1) r = 0;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Replace the first whole-word occurrence of term (case-insensitive) with the blank.
 * @param {string} sentence
 * @param {string} term
 * @returns {string|null}
 */
function blankOut(sentence, term) {
  const lower = term.toLowerCase();
  for (const m of sentence.matchAll(WORD_RE)) {
    if (m[0].toLowerCase() === lower) {
      return sentence.slice(0, m.index) + BLANK + sentence.slice(m.index + m[0].length);
    }
  }
  return null;
}

/**
 * Build 5 cloze questions from notes, or report not-enough-detail. Never throws.
 * @param {unknown} notes
 * @param {() => number} rng returns a number in [0, 1)
 * @returns {FallbackResult}
 */
export function generateFallbackQuiz(notes, rng) {
  const fail = /** @type {FallbackResult} */ ({ ok: false, reason: 'not-enough-detail' });
  try {
    const next = typeof rng === 'function' ? rng : () => 0.5;
    const sentences = splitSentences(notes);
    if (sentences.length < QUIZ_SIZE) return fail;

    const all = [];
    const seen = new Set();
    for (const s of sentences) {
      for (const t of extractKeyTerms(s)) {
        const k = t.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          all.push(t);
        }
      }
    }
    if (all.length < 4) return fail;

    const questions = [];
    for (const s of shuffle(sentences, next)) {
      if (questions.length === QUIZ_SIZE) break;
      const terms = extractKeyTerms(s);
      if (terms.length === 0) continue;
      const t = terms[Math.min(terms.length - 1, Math.floor((Number(next()) || 0) * terms.length))];
      const text = blankOut(s, t);
      if (text === null || text.length > MAX_TEXT) continue;
      const others = shuffle(
        all.filter((x) => x.toLowerCase() !== t.toLowerCase()),
        next,
      ).slice(0, 3);
      if (others.length < 3) continue;
      const options = shuffle([t, ...others], next);
      questions.push({ text, options, correctIndex: options.indexOf(t) });
    }

    if (!isValidQuiz(questions)) return fail;
    return { ok: true, questions: /** @type {Question[]} */ (questions) };
  } catch {
    return fail;
  }
}
