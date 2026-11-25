import { useEffect, useMemo, useRef, useState } from 'react';
import { useStorage } from '../hooks/useStorage.js';
import { useStudySession } from '../hooks/useStudySession.js';
import {
  addCard,
  createDeck,
  deleteCard,
  deleteDeck,
  editCard,
  renameDeck,
} from '../logic/decks.js';
import { defaultDecks, isValidDecks } from '../logic/storageCodec.js';
import { KEYS } from '../services/storageService.js';

/**
 * Generate ids at the side-effect boundary. The deck operations themselves
 * remain pure and receive their ids as arguments.
 *
 * @param {string} prefix
 * @returns {string}
 */
function makeId(prefix) {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Fall through to the local-only fallback when crypto is unavailable.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** @param {string} field @param {string} message */
function fieldError(field, message) {
  return { [field]: message };
}

/**
 * Render deck and card management together with study mode for the selected deck.
 * The management controls remain available while the selected deck is being
 * studied so cards can be added from the empty-deck state.
 *
 * @param {{onNavigate?: (screen: string) => void}} props
 */
export default function GrimoireScreen() {
  const [deckData, setDeckData, storageStatus] = useStorage(
    KEYS.decks,
    defaultDecks,
    isValidDecks,
  );
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [renamingDeckId, setRenamingDeckId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [frontDraft, setFrontDraft] = useState('');
  const [backDraft, setBackDraft] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [editFrontDraft, setEditFrontDraft] = useState('');
  const [editBackDraft, setEditBackDraft] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const addCardFrontRef = useRef(null);

  const decks = Array.isArray(deckData?.decks) ? deckData.decks : [];
  const selectedDeck = useMemo(
    () => decks.find((deck) => deck && deck.id === selectedDeckId) || null,
    [decks, selectedDeckId],
  );
  const study = useStudySession(selectedDeck);

  // Keep the selected deck valid after loading, creating or deleting decks.
  useEffect(() => {
    if (decks.length === 0) {
      if (selectedDeckId !== null) setSelectedDeckId(null);
      return;
    }
    if (!decks.some((deck) => deck.id === selectedDeckId)) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  const persistenceError = storageStatus.error
    ? hasAttemptedSave
      ? 'Decks could not be saved.'
      : 'Decks could not be loaded.'
    : null;

  const persist = (nextDecks) => {
    setHasAttemptedSave(true);
    setDeckData({ decks: nextDecks });
  };

  const handleOperationError = (result) => {
    setValidationErrors(fieldError(result.error.field, result.error.message));
  };

  const handleCreateDeck = (event) => {
    event.preventDefault();
    const result = createDeck(decks, deckName, makeId('deck'));
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    setDeckName('');
    setSelectedDeckId(result.decks[result.decks.length - 1].id);
    persist(result.decks);
  };

  const startRename = (deck) => {
    setRenamingDeckId(deck.id);
    setRenameDraft(deck.name);
    setValidationErrors({});
  };

  const cancelRename = () => {
    setRenamingDeckId(null);
    setRenameDraft('');
    setValidationErrors({});
  };

  const handleRenameDeck = (event, deckId) => {
    event.preventDefault();
    const result = renameDeck(decks, deckId, renameDraft);
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    cancelRename();
    persist(result.decks);
  };

  const handleDeleteDeck = (deck) => {
    const confirmed = typeof globalThis.confirm !== 'function'
      || globalThis.confirm(`Delete the deck "${deck.name}" and all of its cards?`);
    if (!confirmed) return;

    const result = deleteDeck(decks, deck.id);
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    if (renamingDeckId === deck.id) cancelRename();
    persist(result.decks);
  };

  const handleAddCard = (event) => {
    event.preventDefault();
    if (!selectedDeck) return;
    const result = addCard(
      decks,
      selectedDeck.id,
      frontDraft,
      backDraft,
      makeId('card'),
    );
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    setFrontDraft('');
    setBackDraft('');
    persist(result.decks);
  };

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditFrontDraft(card.front);
    setEditBackDraft(card.back);
    setValidationErrors({});
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditFrontDraft('');
    setEditBackDraft('');
    setValidationErrors({});
  };

  const handleEditCard = (event, cardId) => {
    event.preventDefault();
    if (!selectedDeck) return;
    const result = editCard(
      decks,
      selectedDeck.id,
      cardId,
      editFrontDraft,
      editBackDraft,
    );
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    cancelEditCard();
    persist(result.decks);
  };

  const handleDeleteCard = (cardId) => {
    if (!selectedDeck) return;
    const result = deleteCard(decks, selectedDeck.id, cardId);
    if (!result.ok) {
      handleOperationError(result);
      return;
    }
    setValidationErrors({});
    if (editingCardId === cardId) cancelEditCard();
    persist(result.decks);
  };

  const errorFor = (field) => validationErrors[field] || null;

  const focusAddCard = () => {
    addCardFrontRef.current?.focus();
  };

  const handleStudyKeyDown = (event) => {
    if (
      event.target === event.currentTarget
      && !study.flipped
      && (event.key === ' ' || event.key === 'Spacebar')
    ) {
      event.preventDefault();
      study.flip();
    }
  };

  return (
    <section className="grimoire-screen" aria-labelledby="grimoire-screen-title">
      <h1 id="grimoire-screen-title">Grimoire</h1>

      {persistenceError ? <p role="alert">{persistenceError}</p> : null}

      <section className="grimoire-decks" aria-labelledby="grimoire-decks-title">
        <h2 id="grimoire-decks-title">Decks</h2>
        <form className="grimoire-form grimoire-form--deck" onSubmit={handleCreateDeck}>
          <label htmlFor="grimoire-deck-name">Deck name</label>
          <input
            id="grimoire-deck-name"
            name="deckName"
            type="text"
            value={deckName}
            onChange={(event) => setDeckName(event.target.value)}
            aria-describedby={errorFor('name') ? 'grimoire-name-error' : undefined}
          />
          <button type="submit">Create deck</button>
          {errorFor('name') ? (
            <p id="grimoire-name-error" role="alert">{errorFor('name')}</p>
          ) : null}
        </form>

        {decks.length === 0 ? (
          <p>No decks yet.</p>
        ) : (
          <ul className="grimoire-deck-list" aria-label="Deck list">
            {decks.map((deck) => (
              <li className="grimoire-deck-list__item" key={deck.id}>
                {renamingDeckId === deck.id ? (
                  <form className="grimoire-form grimoire-form--rename" onSubmit={(event) => handleRenameDeck(event, deck.id)}>
                    <label htmlFor={`rename-deck-${deck.id}`}>Deck name</label>
                    <input
                      id={`rename-deck-${deck.id}`}
                      type="text"
                                value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      aria-describedby={errorFor('name') ? `rename-error-${deck.id}` : undefined}
                    />
                    <button type="submit">Save deck name</button>
                    <button type="button" onClick={cancelRename}>Cancel</button>
                    {errorFor('name') ? (
                      <p id={`rename-error-${deck.id}`} role="alert">{errorFor('name')}</p>
                    ) : null}
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-pressed={selectedDeckId === deck.id}
                      onClick={() => setSelectedDeckId(deck.id)}
                    >
                      {deck.name}
                    </button>
                    <span>{deck.cards.length} cards</span>
                    <button type="button" onClick={() => startRename(deck)}>
                      Rename deck
                    </button>
                    <button type="button" onClick={() => handleDeleteDeck(deck)}>
                      Delete deck
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedDeck ? (
        <section
          className="grimoire-study"
          aria-labelledby="grimoire-study-title"
          tabIndex={0}
          onKeyDown={handleStudyKeyDown}
        >
          <h2 id="grimoire-study-title">Study {selectedDeck.name}</h2>

          {study.error ? <p role="alert">{study.error}</p> : null}

          {study.emptyDeck ? (
            <>
              <p>This deck is empty. Add a card to begin studying.</p>
              <button type="button" onClick={focusAddCard}>Add a card</button>
            </>
          ) : study.complete ? (
            <div className="grimoire-study__summary" aria-labelledby="grimoire-study-summary-title" role="status">
              <h3 id="grimoire-study-summary-title">Study session complete</h3>
              <p>Got it: {study.gotCount}</p>
              <p>Missed it: {study.missedCount}</p>
            </div>
          ) : study.currentCard ? (
            <div className="grimoire-study__card-shell" aria-label="Study card">
              <button
                type="button"
                className={`card-flip grimoire-study__card${study.flipped ? ' is-flipped' : ''}`}
                onClick={study.flip}
                aria-label={study.flipped ? 'Show front of card' : 'Flip card to show back'}
              >
                {study.flipped ? study.currentCard.back : study.currentCard.front}
              </button>
              <button type="button" onClick={study.flip}>
                Flip card
              </button>
              {study.flipped ? (
                <div className="grimoire-study__answers" aria-label="Study answer controls">
                  <button type="button" onClick={() => study.answer('got')}>
                    Got it
                  </button>
                  <button type="button" onClick={() => study.answer('missed')}>
                    Missed it
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedDeck ? (
        <section className="grimoire-cards" aria-labelledby="grimoire-cards-title">
          <h2 id="grimoire-cards-title">Cards in {selectedDeck.name}</h2>

          <form className="grimoire-form grimoire-form--card" onSubmit={handleAddCard}>
            <h3>Add card</h3>
            <div>
              <label htmlFor="grimoire-card-front">Front</label>
              <textarea
                ref={addCardFrontRef}
                id="grimoire-card-front"
                name="front"
                value={frontDraft}
                onChange={(event) => setFrontDraft(event.target.value)}
                aria-describedby={errorFor('front') ? 'grimoire-front-error' : undefined}
              />
              {errorFor('front') ? (
                <p id="grimoire-front-error" role="alert">{errorFor('front')}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="grimoire-card-back">Back</label>
              <textarea
                id="grimoire-card-back"
                name="back"
                value={backDraft}
                onChange={(event) => setBackDraft(event.target.value)}
                aria-describedby={errorFor('back') ? 'grimoire-back-error' : undefined}
              />
              {errorFor('back') ? (
                <p id="grimoire-back-error" role="alert">{errorFor('back')}</p>
              ) : null}
            </div>
            <button type="submit">Add card</button>
          </form>

          {selectedDeck.cards.length === 0 ? (
            <p>This deck has no cards.</p>
          ) : (
            <ul className="grimoire-card-list" aria-label={`${selectedDeck.name} card list`}>
              {selectedDeck.cards.map((card) => (
                <li className="grimoire-card-list__item" key={card.id}>
                  {editingCardId === card.id ? (
                    <form className="grimoire-form grimoire-form--edit-card" onSubmit={(event) => handleEditCard(event, card.id)}>
                      <label htmlFor={`edit-front-${card.id}`}>Front</label>
                      <textarea
                        id={`edit-front-${card.id}`}
                                value={editFrontDraft}
                        onChange={(event) => setEditFrontDraft(event.target.value)}
                        aria-describedby={errorFor('front') ? `edit-front-error-${card.id}` : undefined}
                      />
                      {errorFor('front') ? (
                        <p id={`edit-front-error-${card.id}`} role="alert">{errorFor('front')}</p>
                      ) : null}
                      <label htmlFor={`edit-back-${card.id}`}>Back</label>
                      <textarea
                        id={`edit-back-${card.id}`}
                                value={editBackDraft}
                        onChange={(event) => setEditBackDraft(event.target.value)}
                        aria-describedby={errorFor('back') ? `edit-back-error-${card.id}` : undefined}
                      />
                      {errorFor('back') ? (
                        <p id={`edit-back-error-${card.id}`} role="alert">{errorFor('back')}</p>
                      ) : null}
                      <button type="submit">Save card</button>
                      <button type="button" onClick={cancelEditCard}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <p><strong>Front:</strong> {card.front}</p>
                      <p><strong>Back:</strong> {card.back}</p>
                      <button type="button" onClick={() => startEditCard(card)}>
                        Edit card
                      </button>
                      <button type="button" onClick={() => handleDeleteCard(card.id)}>
                        Delete card
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  );
}

export { makeId };
