import { useEffect, useState } from 'react';
import CandleVisual from '../components/CandleVisual.jsx';
import { useCandle } from '../hooks/useCandle.js';
import { formatMMSS } from '../logic/timer.js';

const MINUTES_LIMITS = Object.freeze({
  study: { min: 1, max: 120 },
  break: { min: 1, max: 60 },
});

/**
 * Render the focus timer and its settings controls.
 *
 * @param {{onNavigate?: (screen: string) => void}} props
 */
export default function CandleScreen() {
  const candle = useCandle();
  const {
    mode,
    status,
    remainingMs,
    studyMinutes,
    breakMinutes,
    start,
    pause,
    reset,
    setStudyMinutes,
    setBreakMinutes,
    validationMessage,
    error,
    completionMessage,
    dismissCompletion,
    announcement,
    liveRegionProps,
    isRunning,
  } = candle;

  const [studyDraft, setStudyDraft] = useState(String(studyMinutes));
  const [breakDraft, setBreakDraft] = useState(String(breakMinutes));

  useEffect(() => {
    setStudyDraft(String(studyMinutes));
  }, [studyMinutes]);

  useEffect(() => {
    setBreakDraft(String(breakMinutes));
  }, [breakMinutes]);

  const activeMinutes = mode === 'break' ? breakMinutes : studyMinutes;
  const totalMs = Number.isFinite(activeMinutes) && activeMinutes > 0
    ? activeMinutes * 60 * 1000
    : 0;
  const modeLabel = mode === 'break' ? 'Break' : 'Study';
  const statusLabel = status === 'running'
    ? 'Running'
    : status === 'paused'
      ? 'Paused'
      : 'Ready';
  const settingsErrorId = validationMessage ? 'candle-settings-error' : undefined;
  const persistenceError = error && error !== validationMessage ? error : null;

  const handleStudyChange = (event) => {
    const value = event.target.value;
    setStudyDraft(value);
    setStudyMinutes(value);
  };

  const handleBreakChange = (event) => {
    const value = event.target.value;
    setBreakDraft(value);
    setBreakMinutes(value);
  };

  return (
    <section aria-labelledby="candle-screen-title">
      <h1 id="candle-screen-title">Candle</h1>

      <div className="candle-timer" aria-labelledby="candle-timer-title">
        <h2 id="candle-timer-title">{modeLabel} session</h2>
        <p
          className="candle-timer__display"
          role="timer"
          aria-label={`${modeLabel} session, ${formatMMSS(remainingMs)} remaining`}
        >
          {formatMMSS(remainingMs)}
        </p>
        <p className="candle-timer__status" aria-live="polite">
          {statusLabel}
        </p>

        <div className="candle-timer__controls" aria-label="Timer controls">
          <button type="button" onClick={start}>
            Start
          </button>
          <button type="button" onClick={pause} disabled={!isRunning}>
            Pause
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <CandleVisual remainingMs={remainingMs} totalMs={totalMs} status={status} />

      <form className="candle-settings" onSubmit={(event) => event.preventDefault()}>
        <h2>Session lengths</h2>
        <div className="candle-settings__field">
          <label htmlFor="candle-study-minutes">Study length (minutes)</label>
          <input
            id="candle-study-minutes"
            name="studyMinutes"
            type="number"
            min={MINUTES_LIMITS.study.min}
            max={MINUTES_LIMITS.study.max}
            step="1"
            inputMode="numeric"
            value={studyDraft}
            onChange={handleStudyChange}
            aria-describedby={settingsErrorId}
          />
        </div>
        <div className="candle-settings__field">
          <label htmlFor="candle-break-minutes">Break length (minutes)</label>
          <input
            id="candle-break-minutes"
            name="breakMinutes"
            type="number"
            min={MINUTES_LIMITS.break.min}
            max={MINUTES_LIMITS.break.max}
            step="1"
            inputMode="numeric"
            value={breakDraft}
            onChange={handleBreakChange}
            aria-describedby={settingsErrorId}
          />
        </div>
        {validationMessage ? (
          <p id="candle-settings-error" role="alert">
            {validationMessage}
          </p>
        ) : null}
      </form>

      {persistenceError ? (
        <p role="alert">{persistenceError}</p>
      ) : null}

      {completionMessage ? (
        <div className="candle-completion" role="status" aria-live="polite">
          <p>{completionMessage}</p>
          <button type="button" onClick={dismissCompletion}>
            Dismiss
          </button>
        </div>
      ) : null}

      <p {...liveRegionProps}>{announcement}</p>
    </section>
  );
}
