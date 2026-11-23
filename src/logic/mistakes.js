// Pure merge logic for saving incorrectly answered quiz questions as flashcards.

import { isValidDecks } from './storageCodec.js';
import { isValidQuestion } from './quiz.js';

/** @typedef {{id:string, front:string, back:string, missCount:number}} Card */
/** @typedef {{id:string, name:string, cards:Card[]}} Deck */
/** @typedef {{text:string, options:string[], correctIndex:number}} Question */

export const MISTAKES_DECK_NAME = 'Seance Mistakes';

/**
 * Return the deck list when it has a valid persisted shape.
 * @param {unknown} decks
 * @returns {Deck[]|null}
 */
function safeDecks(decks) {
  return isValidDecks({ decks }) ? /** @type {Deck[]} */ (decks) : null;
}

/**
 * Call the injected id factory and reject ids that cannot produce a valid card/deck.
 * @param {() => unknown} makeId
 * @returns {string|null}
 */
function nextId(makeId) {
  try {
    const id = makeId();
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Add the supplied incorrect questions to the Seance Mistakes deck.
 *
 * The caller supplies only questions answered incorrectly. This function does not
 * infer answer correctness; it validates the question shape, uses the question
 * text as the card front and the selected correct option as the card back.
 * Duplicate fronts are skipped, including duplicates within one batch. Inputs are
 * never mutated, and malformed input produces a safe result without new data.
 *
 * @param {unknown} decks
 * @param {unknown} questions
 * @param {unknown} makeId
 * @returns {{decks:Deck[], added:number, skipped:number}}
 */
export function addMistakes(decks, questions, makeId) {
  const original = safeDecks(decks);
  if (original === null) return { decks: [], added: 0, skipped: 0 };
  if (!Array.isArray(questions) || typeof makeId !== 'function') {
    return { decks: original, added: 0, skipped: 0 };
  }

  try {
    const mistakeDeckIndex = original.findIndex((deck) => deck.name === MISTAKES_DECK_NAME);
    const existingDeck = mistakeDeckIndex >= 0 ? original[mistakeDeckIndex] : null;
    const seenFronts = new Set(existingDeck ? existingDeck.cards.map((card) => card.front) : []);
    const pending = [];
    let skipped = 0;

    for (const question of questions) {
      if (!isValidQuestion(question)) continue;
      if (seenFronts.has(question.text)) {
        skipped += 1;
        continue;
      }
      seenFronts.add(question.text);
      pending.push(question);
    }

    if (pending.length === 0) return { decks: original, added: 0, skipped };

    const deckId = existingDeck ? existingDeck.id : nextId(/** @type {() => unknown} */ (makeId));
    if (!existingDeck && !deckId) return { decks: original, added: 0, skipped: 0 };

    const cards = [];
    for (const question of pending) {
      const cardId = nextId(/** @type {() => unknown} */ (makeId));
      if (!cardId) return { decks: original, added: 0, skipped: 0 };
      cards.push({
        id: cardId,
        front: question.text,
        back: question.options[question.correctIndex],
        missCount: 0,
      });
    }

    const nextDeck = existingDeck
      ? { ...existingDeck, cards: [...existingDeck.cards, ...cards] }
      : { id: /** @type {string} */ (deckId), name: MISTAKES_DECK_NAME, cards };
    const next = existingDeck
      ? original.map((deck, index) => (index === mistakeDeckIndex ? nextDeck : deck))
      : [...original, nextDeck];

    return { decks: next, added: cards.length, skipped };
  } catch {
    return { decks: original, added: 0, skipped: 0 };
  }
}
