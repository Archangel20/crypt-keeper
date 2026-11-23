// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isValidQuestion, isValidQuiz, printQuestions, parseQuestions } from '../../src/logic/quiz.js';

const q = (n) => ({
  text: `Question ${n}?`,
  options: ['a' + n, 'b' + n, 'c' + n, 'd' + n],
  correctIndex: n % 4,
});
const quiz = [0, 1, 2, 3, 4].map(q);

describe('isValidQuestion', () => {
  it('accepts a good question', () => expect(isValidQuestion(q(1))).toBe(true));
  it('rejects duplicate options ignoring case and spaces', () => {
    expect(isValidQuestion({ ...q(1), options: ['A', ' a ', 'c', 'd'] })).toBe(false);
  });
  it('rejects bad index, option count, empty or long text', () => {
    expect(isValidQuestion({ ...q(1), correctIndex: 4 })).toBe(false);
    expect(isValidQuestion({ ...q(1), correctIndex: 1.5 })).toBe(false);
    expect(isValidQuestion({ ...q(1), options: ['a', 'b', 'c'] })).toBe(false);
    expect(isValidQuestion({ ...q(1), text: '' })).toBe(false);
    expect(isValidQuestion({ ...q(1), text: 'x'.repeat(301) })).toBe(false);
    expect(isValidQuestion(null)).toBe(false);
  });
});

describe('isValidQuiz', () => {
  it('requires exactly 5 valid questions', () => {
    expect(isValidQuiz(quiz)).toBe(true);
    expect(isValidQuiz(quiz.slice(0, 4))).toBe(false);
    expect(isValidQuiz([...quiz, q(5)])).toBe(false);
    expect(isValidQuiz('nope')).toBe(false);
  });
});

describe('printQuestions / parseQuestions', () => {
  it('round trips', () => {
    expect(parseQuestions(printQuestions(quiz))).toEqual({ ok: true, questions: quiz });
  });
  it('tolerates a Markdown code fence', () => {
    const fenced = '```json\n' + printQuestions(quiz) + '\n```';
    expect(parseQuestions(fenced)).toEqual({ ok: true, questions: quiz });
  });
  it('never throws and reports failure', () => {
    for (const bad of ['', 'not json', '{}', '[]', null, undefined, 42, '{"questions":[null]}']) {
      expect(parseQuestions(bad).ok).toBe(false);
    }
  });
  it('rejects fewer than 5 questions', () => {
    expect(parseQuestions(printQuestions(quiz.slice(0, 3))).ok).toBe(false);
  });
});
