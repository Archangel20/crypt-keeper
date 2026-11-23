import useSeance from '../hooks/useSeance.js';
import { NOTES_MAX, NOTES_MIN } from '../logic/validation.js';

const CORRECT_MESSAGES = Object.freeze([
  'The spirits approve. That answer is correct!',
  'The Ghost nods through the mist. Well done!',
  'A friendly whisper confirms your answer!',
]);

const INCORRECT_MESSAGES = Object.freeze([
  'The Ghost shivers. The correct answer is revealed below.',
  'The séance stirs, but that answer was not the one.',
  'A cold breeze marks that answer as incorrect.',
]);

function ghostMessage(answer, questionIndex) {
  if (answer === null || answer === undefined) return 'The Ghost awaits your answer.';
  const messages = answer.correct ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
  return messages[questionIndex % messages.length];
}

function optionClassName(answered, optionIndex, correctIndex, selectedIndex) {
  if (!answered) return 'seance__option';
  if (optionIndex === correctIndex) return 'seance__option is-correct';
  if (optionIndex === selectedIndex) return 'seance__option is-incorrect';
  return 'seance__option';
}

/**
 * Render the Seance notes form, five-question quiz, and mistake-saving controls.
 */
export default function SeanceScreen() {
  const seance = useSeance();
  const {
    notes,
    setNotes,
    loading,
    source,
    notice,
    error,
    questions,
    currentQuestion,
    currentAnswer,
    questionIndex,
    answered,
    finished,
    score,
    submit,
    handleSubmit,
    selectOption,
    next,
    retry,
    newNotes,
    wrongIndexes = [],
    saveMistake,
    saveQuestion,
    saveAllMistakes,
    saveAll,
  } = seance;
  const saveQuestionAction = saveQuestion || saveMistake;
  const saveAllAction = saveAll || saveAllMistakes;
  const incorrectQuestionIndexes = Array.isArray(wrongIndexes) ? wrongIndexes : [];
  const answerIsCorrect = answered && currentQuestion
    ? currentAnswer === currentQuestion.correctIndex
    : null;
  const answerForGhost = answered ? { correct: answerIsCorrect } : null;
  const notesVisible = questions.length === 0 || finished;

  const handleNewNotes = () => {
    newNotes();
    setNotes('');
  };

  return (
    <section aria-labelledby="seance-screen-title">
      <h1 id="seance-screen-title">Seance</h1>

      {notesVisible ? (
        <section aria-labelledby="seance-notes-title">
          <h2 id="seance-notes-title">Prepare your notes</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="seance-notes">Notes</label>
            <textarea
              id="seance-notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={10}
              aria-describedby="seance-notes-count seance-notes-privacy"
            />
            <p id="seance-notes-count" aria-live="polite">
              {notes.length} characters (minimum {NOTES_MIN}, maximum {NOTES_MAX})
            </p>
            <p id="seance-notes-privacy">
              Your notes are sent to the secure quiz service to create questions. If the AI provider is unavailable, simple questions are generated locally.
            </p>
            {error ? <p role="alert">{error}</p> : null}
            <button type="submit" disabled={loading}>
              {loading ? 'Summoning questions…' : 'Summon questions'}
            </button>
            {loading ? (
              <p role="status" aria-live="polite">The Ghost is preparing your quiz…</p>
            ) : null}
          </form>
        </section>
      ) : null}

      {source ? <p aria-label="Quiz source">Source: {source}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {!notesVisible && error ? <p role="alert">{error}</p> : null}

      {questions.length > 0 && !finished && currentQuestion ? (
        <section aria-labelledby="seance-quiz-title">
          <h2 id="seance-quiz-title">The Ghost’s quiz</h2>
          <p>Question {questionIndex + 1} of 5</p>

          <div className="seance__ghost" role="img" aria-label="Ghost">
            <span aria-hidden="true">👻</span>
            <p>{ghostMessage(answerForGhost, questionIndex)}</p>
          </div>

          <div aria-live="polite">
            <h3>{currentQuestion.text}</h3>
            <div role="group" aria-label="Answer options">
              {currentQuestion.options.map((option, optionIndex) => {
                const isCorrect = answered && optionIndex === currentQuestion.correctIndex;
                const isIncorrect = answered
                  && optionIndex === currentAnswer
                  && optionIndex !== currentQuestion.correctIndex;
                let label = option;
                if (isCorrect) label = `${option} (correct answer)`;
                if (isIncorrect) label = `${option} (your answer, incorrect)`;

                return (
                  <button
                    type="button"
                    className={optionClassName(
                      answered,
                      optionIndex,
                      currentQuestion.correctIndex,
                      currentAnswer,
                    )}
                    key={`${questionIndex}-${optionIndex}`}
                    onClick={() => selectOption(optionIndex)}
                    disabled={answered}
                    aria-pressed={currentAnswer === optionIndex}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {answered && !finished ? (
            <button type="button" onClick={next}>
              Next question
            </button>
          ) : null}
        </section>
      ) : null}

      {!finished && incorrectQuestionIndexes.length > 0 ? (
        <section aria-labelledby="seance-mistakes-title">
          <h3 id="seance-mistakes-title">Mistakes to save</h3>
          <ul>
            {incorrectQuestionIndexes.map((index) => {
              const question = questions[index];
              if (!question) return null;
              return (
                <li key={`mistake-${index}`}>
                  <p>{question.text}</p>
                  <button
                    type="button"
                    onClick={() => saveQuestionAction?.(index)}
                  >
                    Save to Grimoire
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {finished ? (
        <section aria-labelledby="seance-results-title" aria-live="polite">
          <h2 id="seance-results-title">Séance complete</h2>
          <p>{score} out of 5</p>
          {incorrectQuestionIndexes.length > 0 ? (
            <button type="button" onClick={() => saveAllAction?.()}>
              Save all mistakes
            </button>
          ) : null}
          <button type="button" onClick={retry}>Retry quiz</button>
          <button type="button" onClick={handleNewNotes}>Paste new notes</button>
        </section>
      ) : null}
    </section>
  );
}

export { CORRECT_MESSAGES, INCORRECT_MESSAGES };
