// localStorage edge. Never throws. Keys are prefixed with `cryptkeeper:`.
import { encode, decode } from '../logic/storageCodec.js';

export const KEY_PREFIX = 'cryptkeeper:';

export const KEYS = Object.freeze({
  settings: `${KEY_PREFIX}settings`,
  stats: `${KEY_PREFIX}stats`,
  decks: `${KEY_PREFIX}decks`,
});

/** @param {string} key @returns {string} */
export function prefixKey(key) {
  const k = String(key);
  return k.startsWith(KEY_PREFIX) ? k : KEY_PREFIX + k;
}

/** Access to globalThis.localStorage can itself throw. @returns {Storage|null} */
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a storage service bound to a storage object (for tests).
 * @param {() => (Storage|null|undefined)} [getStorage]
 */
export function createStorageService(getStorage = defaultStorage) {
  const resolve = () => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };

  /**
   * @param {string} key
   * @param {any} defaults
   * @param {(data: unknown) => boolean} [validate]
   * @returns {{value: any, error?: string}}
   */
  function load(key, defaults, validate) {
    try {
      const storage = resolve();
      if (!storage) return { value: defaults, error: 'unavailable' };
      const raw = storage.getItem(prefixKey(key));
      if (raw === null || raw === undefined) return { value: defaults };
      const res = decode(raw, validate);
      if (!res.ok) return { value: defaults, error: res.reason };
      return { value: res.data };
    } catch {
      return { value: defaults, error: 'unavailable' };
    }
  }

  /**
   * @param {string} key
   * @param {unknown} data
   * @returns {{ok: true} | {ok: false, error: string}}
   */
  function save(key, data) {
    try {
      const storage = resolve();
      if (!storage) return { ok: false, error: 'unavailable' };
      const enc = encode(data);
      if (!enc.ok) return { ok: false, error: enc.reason };
      storage.setItem(prefixKey(key), enc.text);
      return { ok: true };
    } catch {
      return { ok: false, error: 'write-failed' };
    }
  }

  /** @returns {boolean} */
  function isAvailable() {
    try {
      const storage = resolve();
      if (!storage) return false;
      const probe = `${KEY_PREFIX}__probe__`;
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  return { load, save, isAvailable };
}

const defaultService = createStorageService();

export const load = defaultService.load;
export const save = defaultService.save;
export const isAvailable = defaultService.isAvailable;
