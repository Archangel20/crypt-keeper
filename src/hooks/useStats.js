import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultStats, isValidStats } from '../logic/storageCodec.js';
import { dayKey, normalizeStats } from '../logic/stats.js';
import { KEYS, load, save } from '../services/storageService.js';

/**
 * Read the current time at the browser edge. A clock can be injected by a
 * caller that needs deterministic time, while the app uses Date.now().
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
 * Return the delay from a timestamp until the next local midnight in the
 * device's local timezone.
 * @param {number} timestamp
 * @returns {number}
 */
export function delayUntilNextMidnight(timestamp) {
  const current = new Date(timestamp);
  if (Number.isNaN(current.getTime())) return 24 * 60 * 60 * 1000;

  const next = new Date(current);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, next.getTime() - timestamp);
}

/**
 * Load, normalize and maintain the stats shown by the Crypt screen.
 *
 * Normalization is persisted for valid or missing storage data. A failed load
 * is left untouched so an invalid stored value is not overwritten merely by
 * opening the screen. The hook still exposes zero/default values in memory.
 *
 * @param {{clock?: (() => number)|{now: (() => number)|number}}} [options]
 * @returns {{
 *   stats: import('../logic/storageCodec.js').Stats,
 *   refresh: () => import('../logic/storageCodec.js').Stats,
 *   loadError: string|null,
 *   saveError: string|null,
 *   error: string|null,
 *   storageLoadError: string|null,
 *   storageSaveError: string|null,
 *   status: {loadError: string|null, saveError: string|null, error: string|null}
 * }}
 */
export function useStats(options = {}) {
  const clock = options && options.clock;
  const [initialState] = useState(() => {
    const result = load(KEYS.stats, defaultStats, isValidStats);
    return {
      value: result.value,
      loadError: result.error ? 'stats could not be loaded' : null,
      canPersist: !result.error,
    };
  });
  const [stats, setStats] = useState(initialState.value);
  const [saveError, setSaveError] = useState(null);
  const statsRef = useRef(initialState.value);
  const canPersistRef = useRef(initialState.canPersist);

  statsRef.current = stats;

  const refresh = useCallback(() => {
    const today = dayKey(new Date(readNow(clock)));
    const next = normalizeStats(statsRef.current, today);
    statsRef.current = next;
    setStats(next);

    if (!canPersistRef.current) return next;

    const result = save(KEYS.stats, next);
    setSaveError(result.ok ? null : 'stats could not be saved');
    return next;
  }, [clock]);

  useEffect(() => {
    refresh();

    let timeoutId;
    let disposed = false;

    const scheduleMidnightRefresh = () => {
      timeoutId = setTimeout(() => {
        if (disposed) return;
        refresh();
        scheduleMidnightRefresh();
      }, delayUntilNextMidnight(readNow(clock)));
    };

    const onVisibilityChange = () => {
      refresh();
    };

    scheduleMidnightRefresh();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [clock, refresh]);

  const loadError = initialState.loadError;
  const error = loadError || saveError;
  const status = { loadError, saveError, error };

  return {
    stats,
    refresh,
    loadError,
    saveError,
    error,
    storageLoadError: loadError,
    storageSaveError: saveError,
    status,
  };
}

export default useStats;
