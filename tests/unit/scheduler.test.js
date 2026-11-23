// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildQueue, applyResult } from '../../src/logic/scheduler.js';

const card = (id, missCount) => ({ id, front: 'f', back: 'b', missCount });

describe('buildQueue', () => {
  it('returns [] for empty or invalid input', () => {
    expect(buildQueue([], () => 0.3)).toEqual([]);
    expect(buildQueue(undefined, () => 0.3)).toEqual([]);
  });

  it('orders by missCount descending and sets initial flags', () => {
    const q = buildQueue([card('a', 0), card('b', 3), card('c', 1)], () => 0.5);
    expect(q.map((e) => e.cardId)).toEqual(['b', 'c', 'a']);
    expect(q.every((e) => e.confirmed === false && e.missedThisSession === false)).toBe(true);
  });

  it('is a permutation and uses rng among equals', () => {
    const cards = [card('a', 1), card('b', 1), card('c', 1)];
    const q1 = buildQueue(cards, () => 0).map((e) => e.cardId);
    const q2 = buildQueue(cards, () => 0.99).map((e) => e.cardId);
    expect([...q1].sort()).toEqual(['a', 'b', 'c']);
    expect([...q2].sort()).toEqual(['a', 'b', 'c']);
    expect(q1).not.toEqual(q2);
  });

  it('does not mutate the input', () => {
    const cards = [card('a', 0), card('b', 2)];
    const copy = JSON.parse(JSON.stringify(cards));
    buildQueue(cards, () => 0.1);
    expect(cards).toEqual(copy);
  });
});

describe('applyResult', () => {
  const e = (id, confirmed = false, missedThisSession = false) => ({ cardId: id, confirmed, missedThisSession });
  const ids = (q) => q.map((x) => x.cardId);
  const big = () => [e('a'), e('b'), e('c'), e('d'), e('e'), e('f'), e('g')];

  it('missed reinserts 1 to 3 positions after current and flags the entry', () => {
    const lows = applyResult(big(), 'missed', () => 0);
    expect(ids(lows.queue)).toEqual(['b', 'a', 'c', 'd', 'e', 'f', 'g']);
    const highs = applyResult(big(), 'missed', () => 0.99);
    expect(ids(highs.queue)).toEqual(['b', 'c', 'd', 'a', 'e', 'f', 'g']);
    expect(highs.removed).toBe(false);
    expect(highs.queue[3]).toEqual({ cardId: 'a', confirmed: false, missedThisSession: true });
  });

  it('missed on a confirmed card clears the confirmed mark', () => {
    const { queue } = applyResult([e('a', true, true), e('b')], 'missed', () => 0.5);
    expect(queue[1]).toEqual({ cardId: 'a', confirmed: false, missedThisSession: true });
  });

  it('missed goes to the end when fewer than 3 cards remain', () => {
    expect(ids(applyResult([e('a'), e('b')], 'missed', () => 0.99).queue)).toEqual(['b', 'a']);
    expect(ids(applyResult([e('a')], 'missed', () => 0.5).queue)).toEqual(['a']);
  });

  it('got on a clean card removes it', () => {
    const r = applyResult(big(), 'got', () => 0);
    expect(r.removed).toBe(true);
    expect(ids(r.queue)).toEqual(['b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('got on a confirmed card removes it', () => {
    const r = applyResult([e('a', true, true), e('b')], 'got', () => 0);
    expect(r.removed).toBe(true);
    expect(ids(r.queue)).toEqual(['b']);
  });

  it('got after a miss confirms and reinserts 5 positions after current', () => {
    const r = applyResult([e('a', false, true), ...big().slice(1)], 'got', () => 0);
    expect(r.removed).toBe(false);
    expect(ids(r.queue)).toEqual(['b', 'c', 'd', 'e', 'a', 'f', 'g']);
    expect(r.queue[4]).toEqual({ cardId: 'a', confirmed: true, missedThisSession: true });
  });

  it('got after a miss goes to the end when fewer than 5 cards remain', () => {
    const r = applyResult([e('a', false, true), e('b'), e('c')], 'got', () => 0);
    expect(ids(r.queue)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input and never throws on bad input', () => {
    const q = big();
    const copy = JSON.parse(JSON.stringify(q));
    applyResult(q, 'missed', () => 0.5);
    expect(q).toEqual(copy);
    expect(applyResult([], 'got', () => 0)).toEqual({ queue: [], removed: false });
    expect(applyResult(undefined, 'got', () => 0)).toEqual({ queue: [], removed: false });
    expect(applyResult(q, 'bogus', () => 0).queue).toEqual(copy);
  });
});
