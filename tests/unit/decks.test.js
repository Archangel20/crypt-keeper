// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createDeck,
  renameDeck,
  deleteDeck,
  addCard,
  editCard,
  deleteCard,
  incrementMiss,
} from '../../src/logic/decks.js';

const base = () => [
  { id: 'd1', name: 'One', cards: [{ id: 'c1', front: 'a', back: 'b', missCount: 0 }] },
  { id: 'd2', name: 'Two', cards: [] },
];

describe('decks', () => {
  it('createDeck trims the name, starts empty and does not mutate', () => {
    const decks = base();
    const snap = JSON.stringify(decks);
    const r = createDeck(decks, '  New  ', 'd3', 1);
    expect(r.ok).toBe(true);
    expect(r.decks[2]).toEqual({ id: 'd3', name: 'New', cards: [] });
    expect(JSON.stringify(decks)).toBe(snap);
  });

  it('rejects invalid names and returns an error with the field', () => {
    for (const bad of ['', '   ', 'x'.repeat(101)]) {
      const r = createDeck(base(), bad, 'd3', 1);
      expect(r.ok).toBe(false);
      expect(r.error.field).toBe('name');
    }
  });

  it('renameDeck keeps cards and other decks; unknown id errors', () => {
    const r = renameDeck(base(), 'd1', ' Renamed ');
    expect(r.decks[0]).toEqual({ ...base()[0], name: 'Renamed' });
    expect(r.decks[1]).toEqual(base()[1]);
    expect(renameDeck(base(), 'nope', 'x').ok).toBe(false);
  });

  it('deleteDeck removes the deck only', () => {
    const r = deleteDeck(base(), 'd1');
    expect(r.decks.map((d) => d.id)).toEqual(['d2']);
    expect(deleteDeck(base(), 'nope').ok).toBe(false);
  });

  it('addCard trims text and starts with missCount 0', () => {
    const r = addCard(base(), 'd2', ' q ', ' a ', 'c9');
    expect(r.decks[1].cards).toEqual([{ id: 'c9', front: 'q', back: 'a', missCount: 0 }]);
    const bad = addCard(base(), 'd2', 'q', '', 'c9');
    expect(bad.ok).toBe(false);
    expect(bad.error.field).toBe('back');
    expect(addCard(base(), 'nope', 'q', 'a', 'c9').ok).toBe(false);
  });

  it('editCard updates only the target card', () => {
    const r = editCard(base(), 'd1', 'c1', ' x ', ' y ');
    expect(r.decks[0].cards[0]).toEqual({ id: 'c1', front: 'x', back: 'y', missCount: 0 });
    expect(editCard(base(), 'd1', 'c1', 'x'.repeat(501), 'y').error.field).toBe('front');
    expect(editCard(base(), 'd1', 'nope', 'x', 'y').ok).toBe(false);
  });

  it('deleteCard drops the card count by 1', () => {
    const r = deleteCard(base(), 'd1', 'c1');
    expect(r.decks[0].cards).toHaveLength(0);
    expect(deleteCard(base(), 'd1', 'nope').ok).toBe(false);
  });

  it('incrementMiss adds exactly 1 and changes nothing else', () => {
    const decks = base();
    const r = incrementMiss(decks, 'd1', 'c1');
    expect(r.decks[0].cards[0].missCount).toBe(1);
    expect(r.decks[1]).toBe(decks[1]);
    expect(decks[0].cards[0].missCount).toBe(0);
    expect(incrementMiss(decks, 'd1', 'nope').ok).toBe(false);
  });

  it('never throws on a non-array decks value', () => {
    expect(createDeck(null, 'x', 'id', 1).ok).toBe(false);
    expect(incrementMiss(undefined, 'a', 'b').ok).toBe(false);
  });
});
