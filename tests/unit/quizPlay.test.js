// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { initPlay, selectOption, next, score, retry } from '../../src/logic/quizPlay.js';

const q = (n) => ({
  text: `Question ${n}?`,
  options: ['a' + n, 'b' + n, 'c' + n, 'd' + n],
  correctIndex: n % 4,
});
const quiz = [0, 1, 2, 3, 4].map(q);

describe('quizPlay', () => {
  it('initPlay starts at 0 with 5 null answers', () => {
    expect(initPlay(quiz)).toEqual({ index: 0, answers: [null, null, null, null, null], finished: false });
  });

  it('selectOption records only the first answer, immutably', () => {
    const p0 = initPlay(quiz);
    const p1 = selectOption(p0, 2);
    expect(p1.answers[0]).toBe(2);
    expect(p0.answers[0]).toBe(null);
    expect(selectOption(p1, 3).answers[0]).toBe(2);
  });

  it('next is ignored until answered, then advances', () => {
    const p0 = initPlay(quiz);
    expect(next(p0)).toBe(p0);
    expect(next(selectOption(p0, 0)).index).toBe(1);
  });

  it('finishes after the fifth answer and scores correctly', () => {
    let p = initPlay(quiz);
    for (let i = 0; i < 5; i++) {
      p = selectOption(p, i < 3 ? quiz[i].correctIndex : (quiz[i].correctIndex + 1) % 4);
      p = next(p);
    }
    expect(p.finished).toBe(true);
    expect(score(p, quiz)).toBe(3);
  });

  it('retry gives fresh state', () => {
    const p = selectOption(initPlay(quiz), 1);
    expect(retry(p, quiz)).toEqual(initPlay(quiz));
  });

  it('never throws on bad input', () => {
    expect(() => selectOption(null, 1)).not.toThrow();
    expect(() => next(undefined)).not.toThrow();
    expect(score(null, null)).toBe(0);
  });
});
