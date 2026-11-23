import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from './useStorage.js';
import { KEYS, save as saveStorage } from '../services/storageService.js';
import { defaultDecks, isValidDecks } from '../logic/storageCodec.js';
import { buildQueue, applyResult } from '../logic/scheduler.js';
import { incrementMiss } from '../logic/decks.js';

const EMPTY_SESSION = Object.freeze({
  queue: [],
  flipped: false,
  gotCount: 0,
  missedCount: 0,
});

/**
 * @param {unknown} value
 * @returns {Array<{id:string,name:string,cards:Array}>}
 */
function readDeckList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.decks)) {
    return value.decks;
  }
  return [];
}

/**
 * Use the selected deck as the current source of truth while retaining every
 * other deck loaded from storage. This also lets study mode work when the
 * parent has just created a deck and storage has not been reloaded yet.
 *
 * @param {Array} decks
 * @param {object|null|undefined} selectedDeck
 * @returns {Array}
 */
function mergeSelectedDeck(decks, selectedDeck) {
  if (!selectedDeck || typeof selectedDeck !== 'object' || typeof selectedDeck.id !== 'string') {
    return decks;
  }
  const index = decks.findIndex((item) => item && item.id === selectedDeck.id);
  if (index < 0) return [...decks, selectedDeck];
  return decks.map((item, itemIndex) => (itemIndex === index ? selectedDeck : item));
}

/**
 * @param {object|null|undefined} deck
 * @returns {string}
 */
function deckSignature(deck) {
  if (!deck || typeof deck !== 'object') return 'none';
  const cards = Array.isArray(deck.cards) ? deck.cards : [];
  return `${deck.id ?? ''}:${cards
    .map((card) => `${card?.id ?? ''}:${card?.missCount ?? 0}:${card?.front ?? ''}:${card?.back ?? ''}`)
    .join('|')}`;
}

/**
 * Study-mode state for one selected deck.
 *
 * The hook starts a session as soon as a non-empty deck is selected. A caller
 * may provide `{ rng, decks, saveDecks, storageStatus }` as the second
 * argument. `saveDecks` receives the storage shape `{ decks }`, matching the
 * setter returned by `useStorage`; when omitted, the hook saves directly
 * through `storageService` so it can detect a write failure before advancing
 * the queue.
 *
 * @param {{id:string,name:string,cards:Array}|null|undefined} deck
 * @param {{rng?:() => number, decks?:Array|{decks:Array}, saveDecks?:(value:{decks:Array}) => unknown, storageStatus?:{error?:string|null}}|(() => number)|((value:{decks:Array}) => unknown)} [options]
 * @returns {object}
 */
export function useStudySession(deck, options = {}) {
  const normalizedOptions = typeof options === 'function'
    ? (options.length > 0 ? { saveDecks: options } : { rng: options })
    : options || {};
  const rng = typeof normalizedOptions.rng === 'function' ? normalizedOptions.rng : Math.random;
  const rngRef = useRef(rng);
  rngRef.current = rng;

  // useStorage supplies the persisted starting point and keeps this hook
  // compatible with the same storage contract used by GrimoireScreen.
  const [storedDecks, , storedStatus] = useStorage(KEYS.decks, defaultDecks, isValidDecks);
  const selectedCards = deck && Array.isArray(deck.cards) ? deck.cards : [];
  const signature = deckSignature(deck);
  const suppliedDecks = readDeckList(normalizedOptions.decks);
  const initialDecks = suppliedDecks.length > 0
    ? mergeSelectedDeck(suppliedDecks, deck)
    : mergeSelectedDeck(readDeckList(storedDecks), deck);

  const [session, setSession] = useState(() => ({
    queue: buildQueue(selectedCards, rng),
    flipped: false,
    gotCount: 0,
    missedCount: 0,
  }));
  const [sessionDecks, setSessionDecks] = useState(initialDecks);
  const [error, setError] = useState(null);

  const queueRef = useRef(session.queue);
  const flippedRef = useRef(session.flipped);
  const decksRef = useRef(initialDecks);
  const initializedSignatureRef = useRef(signature);
  const externalStatusRef = useRef(normalizedOptions.storageStatus?.error ?? null);

  queueRef.current = session.queue;
  flippedRef.current = session.flipped;
  decksRef.current = sessionDecks;
  externalStatusRef.current = normalizedOptions.storageStatus?.error ?? null;

  useEffect(() => {
    if (initializedSignatureRef.current === signature) return;
    initializedSignatureRef.current = signature;
    const nextQueue = buildQueue(selectedCards, rngRef.current);
    queueRef.current = nextQueue;
    const nextDecks = mergeSelectedDeck(
      readDeckList(normalizedOptions.decks).length > 0
        ? readDeckList(normalizedOptions.decks)
        : readDeckList(storedDecks),
      deck,
    );
    decksRef.current = nextDecks;
    setSessionDecks(nextDecks);
    setSession({ ...EMPTY_SESSION, queue: nextQueue });
    setError(null);
  }, [deck, signature, selectedCards, normalizedOptions.decks, storedDecks]);

  const persistDecks = useCallback((nextDecks) => {
    try {
      if (typeof normalizedOptions.saveDecks === 'function') {
        const result = normalizedOptions.saveDecks({ decks: nextDecks });
        if (result && typeof result === 'object' && result.ok === false) {
          return { ok: false, error: result.error || 'write-failed' };
        }
        if (result === false) return { ok: false, error: 'write-failed' };
        return { ok: true };
      }
      return saveStorage(KEYS.decks, { decks: nextDecks });
    } catch {
      return { ok: false, error: 'write-failed' };
    }
  }, [normalizedOptions.saveDecks]);

  const flip = useCallback(() => {
    if (queueRef.current.length === 0) return false;
    setSession((current) => {
      const flipped = !current.flipped;
      flippedRef.current = flipped;
      return { ...current, flipped };
    });
    return true;
  }, []);

  const answer = useCallback((result) => {
    if (result !== 'got' && result !== 'missed') return false;
    if (!flippedRef.current || queueRef.current.length === 0) return false;

    const currentQueue = queueRef.current;
    const currentEntry = currentQueue[0];
    let nextDecks = decksRef.current;

    if (result === 'missed') {
      const selectedDeckId = deck && typeof deck.id === 'string' ? deck.id : null;
      if (!selectedDeckId) return false;
      const updated = incrementMiss(nextDecks, selectedDeckId, currentEntry.cardId);
      if (!updated.ok) {
        setError('miss count was not saved');
        return false;
      }

      // Keep the increment in memory even when storage rejects the write. The
      // queue is deliberately advanced only after a successful persistence.
      nextDecks = updated.decks;
      decksRef.current = nextDecks;
      setSessionDecks(nextDecks);
      const saveResult = persistDecks(nextDecks);
      if (!saveResult || saveResult.ok === false) {
        setError('miss count was not saved');
        return false;
      }
    }

    const scheduled = applyResult(currentQueue, result, rngRef.current);
    queueRef.current = scheduled.queue;
    flippedRef.current = false;
    setError(null);
    setSession((current) => ({
      queue: scheduled.queue,
      flipped: false,
      gotCount: current.gotCount + (result === 'got' ? 1 : 0),
      missedCount: current.missedCount + (result === 'missed' ? 1 : 0),
    }));
    return true;
  }, [deck, persistDecks]);

  const currentEntry = session.queue[0] || null;
  const currentCard = currentEntry && deck && Array.isArray(deck.cards)
    ? deck.cards.find((card) => card && card.id === currentEntry.cardId) || null
    : null;
  const hasCards = selectedCards.length > 0;
  const emptyDeck = Boolean(deck) && !hasCards;
  const complete = hasCards && session.queue.length === 0;
  const storageError = normalizedOptions.storageStatus?.error
    ? 'miss count was not saved'
    : storedStatus.error && !normalizedOptions.saveDecks
      ? null
      : null;

  return {
    queue: session.queue,
    flipped: session.flipped,
    gotCount: session.gotCount,
    missedCount: session.missedCount,
    currentEntry,
    currentCard,
    deck: sessionDecks.find((item) => item && item.id === deck?.id) || deck || null,
    decks: sessionDecks,
    emptyDeck,
    isEmpty: emptyDeck,
    complete,
    isComplete: complete,
    summary: complete
      ? { gotCount: session.gotCount, missedCount: session.missedCount }
      : null,
    error: error || storageError,
    storageError: error || storageError,
    flip,
    answer,
  };
}

export { EMPTY_SESSION };
export default useStudySession;
