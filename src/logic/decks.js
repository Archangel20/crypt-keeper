// Immutable deck and card operations. Pure, never throws, never reads the clock or makes ids.
// Each function returns { ok: true, decks } or { ok: false, error }; inputs are never mutated.

import { validateName, validateCardText } from './validation.js';

/** @typedef {{id:string, front:string, back:string, missCount:number}} Card */
/** @typedef {{id:string, name:string, cards:Card[]}} Deck */
/** @typedef {{field:string, message:string}} DeckError */
/** @typedef {{ok:true, decks:Deck[]} | {ok:false, error:DeckError}} DeckResult */

/**
 * @param {string} field
 * @param {string} message
 * @returns {{ok:false, error:DeckError}}
 */
function fail(field, message) {
  return { ok: false, error: { field, message } };
}

/** @param {unknown} decks */
function badList(decks) {
  return Array.isArray(decks) ? null : fail('decks', 'Decks could not be read.');
}

/** @param {unknown} id */
function badId(id) {
  return typeof id === 'string' && id.length > 0 ? null : fail('id', 'An id is required.');
}

/**
 * Validate both card sides; returns trimmed values or an error.
 * @param {unknown} front
 * @param {unknown} back
 */
function checkSides(front, back) {
  const f = validateCardText(front, 'front');
  if (!f.ok) return fail(f.field, f.message);
  const b = validateCardText(back, 'back');
  if (!b.ok) return fail(b.field, b.message);
  return { ok: true, front: f.value, back: b.value };
}

/**
 * Create an empty deck. `now` is accepted for API symmetry; decks store no timestamp.
 * @param {Deck[]} decks
 * @param {unknown} name
 * @param {string} id
 * @param {number} [now]
 * @returns {DeckResult}
 */
// eslint-disable-next-line no-unused-vars
export function createDeck(decks, name, id, now) {
  const bad = badList(decks) || badId(id);
  if (bad) return bad;
  const v = validateName(name);
  if (!v.ok) return fail(v.field, v.message);
  if (decks.some((d) => d && d.id === id)) return fail('id', 'That id is already in use.');
  return { ok: true, decks: [...decks, { id, name: v.value, cards: [] }] };
}

/**
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {unknown} name
 * @returns {DeckResult}
 */
export function renameDeck(decks, deckId, name) {
  const bad = badList(decks);
  if (bad) return bad;
  const v = validateName(name);
  if (!v.ok) return fail(v.field, v.message);
  if (!decks.some((d) => d && d.id === deckId)) return fail('deck', 'Deck not found.');
  return {
    ok: true,
    decks: decks.map((d) => (d.id === deckId ? { ...d, name: v.value } : d)),
  };
}

/**
 * @param {Deck[]} decks
 * @param {string} deckId
 * @returns {DeckResult}
 */
export function deleteDeck(decks, deckId) {
  const bad = badList(decks);
  if (bad) return bad;
  if (!decks.some((d) => d && d.id === deckId)) return fail('deck', 'Deck not found.');
  return { ok: true, decks: decks.filter((d) => d.id !== deckId) };
}

/**
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {unknown} front
 * @param {unknown} back
 * @param {string} id
 * @returns {DeckResult}
 */
export function addCard(decks, deckId, front, back, id) {
  const bad = badList(decks) || badId(id);
  if (bad) return bad;
  const s = checkSides(front, back);
  if (!s.ok) return s;
  const deck = decks.find((d) => d && d.id === deckId);
  if (!deck) return fail('deck', 'Deck not found.');
  if (deck.cards.some((c) => c.id === id)) return fail('id', 'That id is already in use.');
  const card = { id, front: s.front, back: s.back, missCount: 0 };
  return {
    ok: true,
    decks: decks.map((d) => (d.id === deckId ? { ...d, cards: [...d.cards, card] } : d)),
  };
}

/**
 * Apply `change` to one card, or fail when the deck or card is unknown.
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {string} cardId
 * @param {(card:Card)=>Card} change
 * @returns {DeckResult}
 */
function updateCard(decks, deckId, cardId, change) {
  const deck = decks.find((d) => d && d.id === deckId);
  if (!deck) return fail('deck', 'Deck not found.');
  if (!deck.cards.some((c) => c.id === cardId)) return fail('card', 'Card not found.');
  return {
    ok: true,
    decks: decks.map((d) =>
      d.id === deckId
        ? { ...d, cards: d.cards.map((c) => (c.id === cardId ? change(c) : c)) }
        : d,
    ),
  };
}

/**
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {string} cardId
 * @param {unknown} front
 * @param {unknown} back
 * @returns {DeckResult}
 */
export function editCard(decks, deckId, cardId, front, back) {
  const bad = badList(decks);
  if (bad) return bad;
  const s = checkSides(front, back);
  if (!s.ok) return s;
  return updateCard(decks, deckId, cardId, (c) => ({ ...c, front: s.front, back: s.back }));
}

/**
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {string} cardId
 * @returns {DeckResult}
 */
export function deleteCard(decks, deckId, cardId) {
  const bad = badList(decks);
  if (bad) return bad;
  const deck = decks.find((d) => d && d.id === deckId);
  if (!deck) return fail('deck', 'Deck not found.');
  if (!deck.cards.some((c) => c.id === cardId)) return fail('card', 'Card not found.');
  return {
    ok: true,
    decks: decks.map((d) =>
      d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
    ),
  };
}

/**
 * Add 1 to a card's missCount.
 * @param {Deck[]} decks
 * @param {string} deckId
 * @param {string} cardId
 * @returns {DeckResult}
 */
export function incrementMiss(decks, deckId, cardId) {
  const bad = badList(decks);
  if (bad) return bad;
  return updateCard(decks, deckId, cardId, (c) => ({ ...c, missCount: c.missCount + 1 }));
}
