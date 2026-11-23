import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from './useStorage.js';
import { KEYS } from '../services/storageService.js';
import {
  defaultSettings,
  defaultStats,
  isValidSettings,
  isValidStats,
} from '../logic/storageCodec.js';
import {
  applyLengthChange,
  completeSession,
  createTimerState,
  isFinished,
  parseMinutes,
  pause as pauseTimer,
  reset as resetTimer,
  start as startTimer,
  tick as tickTimer,
} from '../logic/timer.js';
import { dayKey, recordStudySession } from '../logic/stats.js';

const TICK_INTERVAL_MS = 250;
const SESSION_ENDED_MESSAGE = 'Session ended';

/**
 * Resolve the current time at the side-effect boundary. Tests may provide a
 * clock function or an object with a `now` function; the browser uses Date.now.
 * @param {unknown} clock
 * @returns {number}
 */
function readNow(clock) {
  let value;
  if (typeof clock === 'function') {
    value = clock();
  } else if (clock && typeof clock === 'object' && typeof clock.now === 'function') {
    value = clock.now();
  } else if (clock && typeof clock === 'object' && typeof clock.now === 'number') {
    value = clock.now;
  } else {
    value = Date.now();
  }
  return Number.isFinite(value) ? value : Date.now();
}

/**
 * Candle timer state and persistence hook.
 *
 * The timer itself remains in `logic/timer.js`; this hook owns React state and
 * the browser side effects needed to keep that state current and persisted.
 *
 * @param {{clock?: (() => number)|{now: (() => number)|number}}} [options]
 * @returns {object}
 */
export function useCandle(options = {}) {
  const clock = options && options.clock;
  const [settings, saveSettings, settingsStatus] = useStorage(
    KEYS.settings,
    defaultSettings,
    isValidSettings,
  );
  const [stats, saveStats, statsStatus] = useStorage(
    KEYS.stats,
    defaultStats,
    isValidStats,
  );
  const [timer, setTimer] = useState(() => createTimerState(settings, 'study'));
  const [validationMessage, setValidationMessage] = useState(null);
  const [completionMessage, setCompletionMessage] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [progressError, setProgressError] = useState(null);
  const [settingsError, setSettingsError] = useState(null);

  const settingsRef = useRef(settings);
  const statsRef = useRef(stats);
  const finishHandledRef = useRef(false);
  const mountedRef = useRef(false);
  const previousStatsErrorRef = useRef(statsStatus.error);
  const previousSettingsErrorRef = useRef(settingsStatus.error);

  settingsRef.current = settings;
  statsRef.current = stats;

  const now = useCallback(() => readNow(clock), [clock]);

  // A settings load can complete with a valid value only on the first render,
  // while later settings changes are made through updateLength below.
  useEffect(() => {
    setTimer((current) => (
      current.status === 'running' ? current : applyLengthChange(current, settings)
    ));
  }, [settings]);

  // `useStorage` deliberately keeps its setter small and synchronous. Its
  // status changes on the following render, so turn a newly reported write
  // failure into a Candle-specific user-facing message here.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      previousStatsErrorRef.current = statsStatus.error;
      previousSettingsErrorRef.current = settingsStatus.error;
      return;
    }

    if (statsStatus.error && !previousStatsErrorRef.current) {
      setProgressError('progress was not saved');
    } else if (!statsStatus.error && previousStatsErrorRef.current) {
      setProgressError(null);
    }

    if (settingsStatus.error && !previousSettingsErrorRef.current) {
      setSettingsError('settings could not be saved');
    } else if (!settingsStatus.error && previousSettingsErrorRef.current) {
      setSettingsError(null);
    }

    previousStatsErrorRef.current = statsStatus.error;
    previousSettingsErrorRef.current = settingsStatus.error;
  }, [settingsStatus.error, statsStatus.error]);

  const start = useCallback(() => {
    finishHandledRef.current = false;
    setCompletionMessage(null);
    setAnnouncement('');
    setValidationMessage(null);
    setTimer((current) => startTimer(current, now()));
  }, [now]);

  const pause = useCallback(() => {
    setTimer((current) => pauseTimer(current, now()));
  }, [now]);

  const reset = useCallback(() => {
    // Reset only changes timer state. In particular, it never calls saveStats.
    finishHandledRef.current = false;
    setTimer((current) => resetTimer(current, settingsRef.current));
  }, []);

  const updateLength = useCallback((kind, input) => {
    const parsed = parseMinutes(input, kind);
    if (!parsed.ok) {
      setValidationMessage(parsed.message);
      return parsed;
    }

    setValidationMessage(null);
    const nextSettings = {
      ...settingsRef.current,
      ...(kind === 'break'
        ? { breakMinutes: parsed.value }
        : { studyMinutes: parsed.value }),
    };
    settingsRef.current = nextSettings;
    saveSettings(nextSettings);
    if (settingsStatus.error) {
      setSettingsError('settings could not be saved');
    }
    setTimer((current) => applyLengthChange(current, nextSettings));
    return parsed;
  }, [saveSettings]);

  const dismissCompletion = useCallback(() => {
    setCompletionMessage(null);
  }, []);

  // The 250 ms cadence is intentionally independent of the displayed second:
  // every tick recomputes from the end timestamp, so background throttling does
  // not accumulate drift. Visibility changes perform the same computation now.
  useEffect(() => {
    if (timer.status !== 'running') return undefined;

    const tick = () => {
      setTimer((current) => (
        current.status === 'running' ? tickTimer(current, now()) : current
      ));
    };
    const intervalId = setInterval(tick, TICK_INTERVAL_MS);
    const onVisibilityChange = () => tick();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [now, timer.status]);

  // A finished state is handled in one effect, then immediately replaced with
  // the idle state for the next session. The ref prevents duplicate recording
  // if React re-renders before the state transition is committed.
  useEffect(() => {
    if (!isFinished(timer) || finishHandledRef.current) return;
    finishHandledRef.current = true;
    setAnnouncement(SESSION_ENDED_MESSAGE);

    if (timer.mode === 'study') {
      const minutes = settingsRef.current.studyMinutes;
      const updatedStats = recordStudySession(
        statsRef.current,
        minutes,
        dayKey(new Date(now())),
      );
      statsRef.current = updatedStats;
      saveStats(updatedStats);
      if (statsStatus.error) {
        setProgressError('progress was not saved');
      }
      setCompletionMessage(
        `Session ended. You earned 1 Soul Point. Total Soul Points: ${updatedStats.soulPoints}.`,
      );
    }

    setTimer((current) => completeSession(current, settingsRef.current));
  }, [now, saveStats, timer]);

  const storageLoadError = settingsStatus.error
    ? 'settings could not be loaded'
    : statsStatus.error
      ? 'progress could not be loaded'
      : null;
  const error = progressError || settingsError || storageLoadError || validationMessage;

  return {
    settings,
    stats,
    studyMinutes: settings.studyMinutes,
    breakMinutes: settings.breakMinutes,
    timer,
    mode: timer.mode,
    status: timer.status,
    remainingMs: timer.remainingMs,
    endTimestamp: timer.endTimestamp,
    start,
    pause,
    reset,
    updateLength,
    setLength: updateLength,
    setStudyMinutes: (input) => updateLength('study', input),
    setBreakMinutes: (input) => updateLength('break', input),
    dismissCompletion,
    completionMessage,
    completionNotice: completionMessage,
    announcement,
    liveAnnouncement: announcement,
    ariaLive: 'assertive',
    liveRegionProps: { 'aria-live': 'assertive', role: 'status' },
    announcementLive: 'assertive',
    progressError,
    settingsError,
    validationMessage,
    error,
    isRunning: timer.status === 'running',
  };
}

export { TICK_INTERVAL_MS, SESSION_ENDED_MESSAGE };

export default useCandle;
