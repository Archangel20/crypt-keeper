import { useState, useCallback, useRef } from 'react';
import { load, save } from '../services/storageService.js';

/**
 * Persistent state backed by storageService. On save failure the value stays
 * in memory and `status.error` is set so the StorageBanner can show.
 * @template T
 * @param {string} key
 * @param {T} defaults
 * @param {(data: unknown) => boolean} [validate]
 * @returns {[T, (next: T | ((prev: T) => T)) => void, {error: string|null}]}
 */
export function useStorage(key, defaults, validate) {
  const [state, setState] = useState(() => {
    const res = load(key, defaults, validate);
    return { value: res.value, error: res.error ?? null };
  });
  const valueRef = useRef(state.value);
  valueRef.current = state.value;

  const setValue = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(valueRef.current) : next;
      valueRef.current = value;
      const res = save(key, value);
      setState({ value, error: res.ok ? null : res.error });
    },
    [key],
  );

  return [state.value, setValue, { error: state.error }];
}
