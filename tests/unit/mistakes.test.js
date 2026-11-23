// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { addMistakes, MISTAKES_DECK_NAME } from '../../src/logic/mistakes.js';

const question = (text, correct = 'Correct answer') => ({
  text,
  options: ['Wrong one', correct, 'Another wrong one', 'Last wrong one'],
  correctIndex: 1,
});

const ids = (...values) => {
  let index = 0;
  return () => values[index++];
};

describe('mistakes', () => {
  it('creates the mistakes deck and adds question cards', () => {
    const result = addMistakes([], [question('What is saved?')], ids('deck-1', 'card-1'));

    expect(MISTAKES_DECK_NAME).toBe('Seance Mistakes');
    expect(result).toEqual({
      decks: [
        {
          id: 'deck-1',
          name: MISTAKES_DECK_NAME,
          cards: [
            {
              id: 'card-1',
              front: 'What is saved?',
              back: 'Correct answer',
              missCount: 0,
            },
          ],
        },
      ],
      added: 1,
      skipped: 0,
    });
  });

  it('adds each new question and skips duplicate fronts in the same batch', () => {
    const result = addMistakes(
      [],
      [question('First'), question('First'), question('Second')],
      ids('deck-1', 'card-1', 'card-2'),
    );

    expect(result.added).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.decks[0].cards.map((card) => card.front)).toEqual(['First', 'Second']);
  });

  it('reuses an existing mistakes deck and skips an existing front', () => {
    const decks = [
      {
        id: 'other',
        name: 'Other deck',
        cards: [],
      },
      {
        id: 'mistakes',
        name: MISTAKES_DECK_NAME,
        cards: [{ id: 'old-card', front: 'Already saved', back: 'Answer', missCount: 0 }],
      },
    ];

    const result = addMistakes(
      decks,
      [question('Already saved'), question('New mistake', 'The answer')],
      ids('new-card'),
    );

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.decks[0]).toBe(decks[0]);
    expect(result.decks[1]).toEqual({
      ...decks[1],
      cards: [...decks[1].cards, {
        id: 'new-card',
        front: 'New mistake',
        back: 'The answer',
        missCount: 0,
      }],
    });
    expect(decks[1].cards).toHaveLength(1);
  });

  it('returns a safe unchanged result for malformed inputs', () => {
    const decks = [{ id: 'd1', name: 'Deck', cards: [] }];
    const snapshot = JSON.stringify(decks);

    expect(addMistakes(null, [question('x')], ids('d', 'c'))).toEqual({
      decks: [],
      added: 0,
      skipped: 0,
    });
    expect(addMistakes(decks, null, ids('d', 'c'))).toEqual({
      decks,
      added: 0,
      skipped: 0,
    });
    expect(addMistakes(decks, [{ text: 'bad' }], ids('d', 'c'))).toEqual({
      decks,
      added: 0,
      skipped: 0,
    });
    expect(addMistakes(decks, [question('x')], null)).toEqual({
      decks,
      added: 0,
      skipped: 0,
    });
    expect(JSON.stringify(decks)).toBe(snapshot);
  });
});
