// Quiz question model. Pure, never throws.
// Wire format: { "questions": [ { "question", "options": [4 strings], "answerIndex" } ] }

/** @typedef {{text:string, options:[string,string,string,string], correctIndex:0|1|2|3}} Question */
/** @typedef {{ok:true, questions:Question[]} | {ok:false, reason:string}} ParseResult */

export const QUIZ_SIZE = 5;
const MAX_TEXT = 300;
const MAX_OPTION = 150;

/**
 * @param {unknown} s
 * @param {number} max
 */
function validString(s, max) {
  return typeof s === 'string' && s.trim().length >= 1 && s.length <= max;
}

/**
 * True when q is a Question: text 1..300, 4 distinct options (trim, case-insensitive)
 * each 1..150, and an integer correctIndex 0..3.
 * @param {unknown} q
 * @returns {boolean}
 */
export function isValidQuestion(q) {
  if (!q || typeof q !== 'object') return false;
  const { text, options, correctIndex } = /** @type {any} */ (q);
  if (!validString(text, MAX_TEXT)) return false;
  if (!Array.isArray(options) || options.length !== 4) return false;
  if (!options.every((o) => validString(o, MAX_OPTION))) return false;
  const keys = new Set(options.map((o) => o.trim().toLowerCase()));
  if (keys.size !== 4) return false;
  return Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex <= 3;
}

/**
 * True when qs is an array of exactly 5 valid Questions.
 * @param {unknown} qs
 * @returns {boolean}
 */
export function isValidQuiz(qs) {
  return Array.isArray(qs) && qs.length === QUIZ_SIZE && qs.every(isValidQuestion);
}

/**
 * Serialize Questions to the JSON format parseQuestions reads. Strings are not altered.
 * @param {Question[]} qs
 * @returns {string}
 */
export function printQuestions(qs) {
  const list = Array.isArray(qs) ? qs : [];
  return JSON.stringify({
    questions: list.map((q) => ({
      question: q.text,
      options: [...q.options],
      answerIndex: q.correctIndex,
    })),
  });
}

/**
 * Remove a surrounding Markdown code fence if present.
 * @param {string} text
 */
function stripFence(text) {
  const t = text.trim();
  const m = /^```[^\r\n]*\r?\n([\s\S]*?)\r?\n?```$/.exec(t);
  return m ? m[1].trim() : t;
}

/**
 * Parse raw model text into exactly 5 valid Questions. Never throws.
 * @param {unknown} text
 * @returns {ParseResult}
 */
export function parseQuestions(text) {
  try {
    if (typeof text !== 'string') return { ok: false, reason: 'not-text' };
    let data;
    try {
      data = JSON.parse(stripFence(text));
    } catch {
      return { ok: false, reason: 'invalid-json' };
    }
    const raw = Array.isArray(data) ? data : data && data.questions;
    if (!Array.isArray(raw)) return { ok: false, reason: 'no-questions' };
    const questions = raw.map((r) =>
      r && typeof r === 'object'
        ? { text: r.question, options: r.options, correctIndex: r.answerIndex }
        : null,
    );
    if (!isValidQuiz(questions)) return { ok: false, reason: 'invalid-questions' };
    return { ok: true, questions: /** @type {Question[]} */ (questions) };
  } catch {
    return { ok: false, reason: 'invalid-questions' };
  }
}
