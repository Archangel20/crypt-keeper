import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from './useStorage.js';
import { defaultDecks, isValidDecks } from '../logic/storageCodec.js';
import { validateNotes } from '../logic/validation.js';
import { generateQuiz as defaultGenerateQuiz } from '../logic/generateQuiz.js';
import {
  initPlay,
  next as nextQuestionState,
  retry as retryPlayState,
  score as scorePlay,
  selectOption as selectPlayOption,
} from '../logic/quizPlay.js';
import { addMistakes } from '../logic/mistakes.js';
import { KEYS } from '../services/storageService.js';

const DETAIL_MESSAGE = 'Please add more detail to your notes.';
const SAVE_FAILURE_MESSAGE = 'Cards could not be saved.';

/** @param {unknown} value @returns {Array} */
function readDecks(value) {
  return value && typeof value === 'object' && Array.isArray(value.decks)
    ? value.decks
    : [];
}

/**
 * Generate ids at the side-effect boundary. `addMistakes` stays pure and can
 * therefore be tested independently of browser APIs.
 * @returns {string}
 */
function makeId() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Use the local-only fallback below.
  }
  return `seance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Return the question indexes answered incorrectly in the current play.
 * @param {Array} questions
 * @param {{answers?:Array, finished?:boolean}} play
 * @returns {number[]}
 */
function wrongIndexes(questions, play) {
  if (!Array.isArray(questions) || !play || !Array.isArray(play.answers)) return [];
  return questions.reduce((indexes, question, index) => {
    if (
      question &&
      play.answers[index] !== null &&
      play.answers[index] !== question.correctIndex
    ) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

/**
 * Resolve a question or a question index to its current quiz index.
 * @param {unknown} questionOrIndex
 * @param {Array} questions
 * @returns {number}
 */
function questionIndex(questionOrIndex, questions) {
  if (Number.isInteger(questionOrIndex)) return questionOrIndex;
  if (questionOrIndex && typeof questionOrIndex === 'object') {
    return questions.findIndex((question) => (
      question === questionOrIndex || question?.text === questionOrIndex.text
    ));
  }
  return -1;
}

/**
 * Orchestrate Seance generation, quiz play, and mistake-card persistence.
 *
 * Notes are intentionally owned by this hook so validation failures and
 * generation failures never replace the text the student pasted. The deck
 * storage setter is used once per save action; a failed write rolls back the
 * hook's optimistic deck view without attempting a second write.
 *
 * @param {{
 *   notes?: string,
 *   rng?: () => number,
 *   makeId?: () => string,
 *   generateQuiz?: typeof defaultGenerateQuiz,
 *   generationOptions?: object,
 *   generateQuizOptions?: object,
 * }} [options]
 * @returns {object}
 */
export function useSeance(options = {}) {
  const [deckData, setDeckData, deckStorageStatus] = useStorage(
    KEYS.decks,
    defaultDecks,
    isValidDecks,
  );
  const initialNotes = typeof options.notes === 'string' ? options.notes : '';
  const [notes, setNotesState] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [play, setPlay] = useState(() => initPlay([]));
  const [decks, setDecks] = useState(() => readDecks(deckData));
  const [savedIndexes, setSavedIndexes] = useState([]);

  const notesRef = useRef(notes);
  const questionsRef = useRef(questions);
  const playRef = useRef(play);
  const decksRef = useRef(decks);
  const persistedDecksRef = useRef(decks);
  const savedIndexesRef = useRef(savedIndexes);
  const generationIdRef = useRef(0);
  const pendingSaveRef = useRef(null);

  notesRef.current = notes;
  questionsRef.current = questions;
  playRef.current = play;
  decksRef.current = decks;
  savedIndexesRef.current = savedIndexes;

  // Convert the asynchronous status update from useStorage into a Seance
  // result. The optimistic state is rolled back only after a failed write.
  useEffect(() => {
    const pending = pendingSaveRef.current;
    if (!pending) return;

    if (deckStorageStatus.error) {
      pendingSaveRef.current = null;
      decksRef.current = pending.previousDecks;
      setDecks(pending.previousDecks);
      setError(SAVE_FAILURE_MESSAGE);
      return;
    }

    pendingSaveRef.current = null;
    persistedDecksRef.current = pending.nextDecks;
    if (pending.indexes.length > 0) {
      const merged = Array.from(new Set([
        ...savedIndexesRef.current,
        ...pending.indexes,
      ]));
      savedIndexesRef.current = merged;
      setSavedIndexes(merged);
    }
    setError(null);
    setNotice(pending.notice);
  }, [deckData, deckStorageStatus.error]);

  const setNotes = useCallback((next) => {
    const value = typeof next === 'function' ? next(notesRef.current) : next;
    const normalized = typeof value === 'string' ? value : '';
    notesRef.current = normalized;
    setNotesState(normalized);
    // Editing notes clears a previous validation/generation message but does
    // not clear a quiz that the student may still be reviewing.
    setError(null);
  }, []);

  const submit = useCallback(async (value = notesRef.current) => {
    const submittedNotes = typeof value === 'string' ? value : notesRef.current;
    notesRef.current = submittedNotes;
    setNotesState(submittedNotes);

    const validation = validateNotes(submittedNotes);
    if (!validation.ok) {
      setLoading(false);
      setError(validation.message);
      return validation;
    }

    const requestId = generationIdRef.current + 1;
    generationIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setNotice(null);
    setSource(null);
    setQuestions([]);
    setPlay(initPlay([]));
    setSavedIndexes([]);
    savedIndexesRef.current = [];

    const generator = options.generateQuiz || defaultGenerateQuiz;
    const configuredOptions = {
      ...(options.generationOptions || options.generateQuizOptions || {}),
      rng: options.rng,
    };

    let result;
    try {
      result = await generator(submittedNotes, configuredOptions);
    } catch {
      result = { ok: false, reason: 'generation-failed', message: 'quiz generation failed' };
    }

    // Ignore a late response from a submission that is no longer current.
    if (requestId !== generationIdRef.current) return result;

    setLoading(false);
    if (result && result.ok === true && Array.isArray(result.questions)) {
      setQuestions(result.questions);
      questionsRef.current = result.questions;
      setPlay(initPlay(result.questions));
      setSource(result.source || null);
      setNotice(result.notice || null);
      setError(null);
      return result;
    }

    setQuestions([]);
    questionsRef.current = [];
    setPlay(initPlay([]));
    setSource(null);
    setNotice(result?.notice || null);
    setError(
      result?.reason === 'not-enough-detail'
        ? DETAIL_MESSAGE
        : result?.message || 'quiz generation failed',
    );
    return result;
  }, [options]);

  const handleSubmit = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    return submit(notesRef.current);
  }, [submit]);

  const selectOption = useCallback((optionIndex) => {
    const nextPlay = selectPlayOption(playRef.current, optionIndex);
    if (nextPlay === playRef.current) return nextPlay;
    playRef.current = nextPlay;
    setPlay(nextPlay);
    return nextPlay;
  }, []);

  const next = useCallback(() => {
    const nextPlay = nextQuestionState(playRef.current);
    if (nextPlay === playRef.current) return nextPlay;
    playRef.current = nextPlay;
    setPlay(nextPlay);
    return nextPlay;
  }, []);

  const retry = useCallback(() => {
    const nextPlay = retryPlayState(playRef.current, questionsRef.current);
    playRef.current = nextPlay;
    setPlay(nextPlay);
    savedIndexesRef.current = [];
    setSavedIndexes([]);
    setError(null);
    setNotice(null);
    return nextPlay;
  }, []);

  const newNotes = useCallback(() => {
    generationIdRef.current += 1;
    setLoading(false);
    setSource(null);
    setNotice(null);
    setError(null);
    questionsRef.current = [];
    setQuestions([]);
    const nextPlay = initPlay([]);
    playRef.current = nextPlay;
    setPlay(nextPlay);
    savedIndexesRef.current = [];
    setSavedIndexes([]);
  }, []);

  const persistMistakes = useCallback((selectedQuestions, indexes, successNotice) => {
    const result = addMistakes(decksRef.current, selectedQuestions, options.makeId || makeId);
    if (result.added === 0 && result.skipped === 0) {
      setError('The selected mistake could not be saved.');
      return { ok: false, result };
    }

    const previousDecks = decksRef.current;
    const nextDecks = result.decks;
    pendingSaveRef.current = {
      previousDecks,
      nextDecks,
      indexes,
      notice: successNotice(result),
    };
    decksRef.current = nextDecks;
    setDecks(nextDecks);
    // useStorage performs the one persistence attempt and reports failure in
    // its status on the following render, which the effect above handles.
    setDeckData({ decks: nextDecks });
    return { ok: true, result };
  }, [options.makeId, setDeckData]);

  const saveMistake = useCallback((questionOrIndex) => {
    const index = questionIndex(questionOrIndex, questionsRef.current);
    if (!wrongIndexes(questionsRef.current, playRef.current).includes(index)) {
      return { ok: false, reason: 'question-not-answered-incorrectly' };
    }
    if (savedIndexesRef.current.includes(index)) {
      setNotice('Card already saved to Grimoire.');
      return { ok: false, reason: 'already-saved' };
    }

    const result = persistMistakes(
      [questionsRef.current[index]],
      [index],
      (saveResult) => saveResult.added === 0
        ? 'Card already exists.'
        : 'Card saved to Grimoire.',
    );
    if (result.ok && result.result.added === 0) {
      savedIndexesRef.current = Array.from(new Set([...savedIndexesRef.current, index]));
      setSavedIndexes(savedIndexesRef.current);
    }
    return result;
  }, [persistMistakes]);

  const saveAllMistakes = useCallback(() => {
    const indexes = wrongIndexes(questionsRef.current, playRef.current);
    if (indexes.length === 0) return { ok: false, reason: 'no-mistakes' };
    const selectedQuestions = indexes.map((index) => questionsRef.current[index]);
    return persistMistakes(
      selectedQuestions,
      indexes,
      (saveResult) => `${saveResult.added} added, ${saveResult.skipped} skipped.`,
    );
  }, [persistMistakes]);

  const currentQuestion = questions[play.index] || null;
  const wrong = wrongIndexes(questions, play);
  const currentAnswer = play.answers[play.index] ?? null;
  const quizScore = scorePlay(play, questions);
  const finished = Boolean(play.finished);
  const storageError = deckStorageStatus.error ? 'Decks could not be loaded.' : null;

  return {
    notes,
    setNotes,
    updateNotes: setNotes,
    loading,
    isLoading: loading,
    source,
    notice,
    error: error || storageError,
    questions,
    play,
    playState: play,
    currentQuestion,
    currentAnswer,
    questionIndex: play.index,
    answered: currentAnswer !== null,
    finished,
    isFinished: finished,
    score: quizScore,
    wrongIndexes: wrong,
    decks,
    deckData: { decks },
    savedIndexes,
    savedQuestionIndexes: savedIndexes,
    submit,
    generate: submit,
    startQuiz: submit,
    handleSubmit,
    selectOption,
    answer: selectOption,
    next,
    nextQuestion: next,
    retry,
    retryQuiz: retry,
    newNotes,
    resetQuiz: newNotes,
    saveMistake,
    saveQuestion: saveMistake,
    saveAllMistakes,
    saveAll: saveAllMistakes,
    storageStatus: deckStorageStatus,
  };
}

export { DETAIL_MESSAGE, SAVE_FAILURE_MESSAGE };
export default useSeance;
