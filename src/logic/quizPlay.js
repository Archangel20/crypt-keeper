// Quiz play state reducer (Seance). Pure, immutable, never throws.

import { QUIZ_SIZE } from './quiz.js';

/** @typedef {import('./quiz.js').Question} Question */
/** @typedef {{index:number, answers:(number|null)[], finished:boolean}} PlayState */

/**
 * Fresh play state: first question, nothing answered.
 * @param {Question[]} [_questions]
 * @returns {PlayState}
 */
export function initPlay(_questions) {
  return { index: 0, answers: Array(QUIZ_SIZE).fill(null), finished: false };
}

/**
 * True when play is a usable PlayState.
 * @param {any} play
 */
function usable(play) {
  return (
    !!play &&
    Array.isArray(play.answers) &&
    Number.isInteger(play.index) &&
    play.index >= 0 &&
    play.index < play.answers.length
  );
}

/**
 * Record the first answer for the current question. Later selections are ignored.
 * @param {PlayState} play
 * @param {number} optionIndex
 * @returns {PlayState}
 */
export function selectOption(play, optionIndex) {
  if (!usable(play) || play.finished) return play;
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return play;
  if (play.answers[play.index] !== null) return play;
  const answers = play.answers.slice();
  answers[play.index] = optionIndex;
  return { ...play, answers };
}

/**
 * Advance to the next question; after the last answered question, finish.
 * Ignored unless the current question is answered.
 * @param {PlayState} play
 * @returns {PlayState}
 */
export function next(play) {
  if (!usable(play) || play.finished) return play;
  if (play.answers[play.index] === null) return play;
  if (play.index >= play.answers.length - 1) return { ...play, finished: true };
  return { ...play, index: play.index + 1 };
}

/**
 * Number of answers equal to the question's correctIndex.
 * @param {PlayState} play
 * @param {Question[]} questions
 * @returns {number}
 */
export function score(play, questions) {
  if (!play || !Array.isArray(play.answers) || !Array.isArray(questions)) return 0;
  let n = 0;
  for (let i = 0; i < play.answers.length && i < questions.length; i++) {
    if (play.answers[i] !== null && questions[i] && play.answers[i] === questions[i].correctIndex) n++;
  }
  return n;
}

/**
 * Fresh state for the same questions.
 * @param {PlayState} _play
 * @param {Question[]} questions
 * @returns {PlayState}
 */
export function retry(_play, questions) {
  return initPlay(questions);
}
