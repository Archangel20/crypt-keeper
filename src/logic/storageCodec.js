// Versioned storage envelope codec and data shape validators. Pure, never throws.

/** @typedef {{studyMinutes:number, breakMinutes:number}} Settings */
/** @typedef {{soulPoints:number, streak:number, lastStudyDay:string|null, todayDay:string|null, todaySessions:number, todayMinutes:number}} Stats */
/** @typedef {{id:string, front:string, back:string, missCount:number}} Card */
/** @typedef {{id:string, name:string, cards:Card[]}} Deck */
/** @typedef {{decks:Deck[]}} Decks */

export const CURRENT_VERSION = 1;

export const defaultSettings = Object.freeze({ studyMinutes: 25, breakMinutes: 5 });
export const defaultStats = Object.freeze({
  soulPoints: 0,
  streak: 0,
  lastStudyDay: null,
  todayDay: null,
  todaySessions: 0,
  todayMinutes: 0,
});
export const defaultDecks = Object.freeze({ decks: [] });

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIntIn = (v, min, max = Infinity) =>
  Number.isInteger(v) && v >= min && v <= max;
const isDay = (v) => {
  if (v === null) return true;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** @param {unknown} v @returns {boolean} */
export function isValidSettings(v) {
  return (
    isObj(v) && isIntIn(v.studyMinutes, 1, 120) && isIntIn(v.breakMinutes, 1, 60)
  );
}

/** @param {unknown} v @returns {boolean} */
export function isValidStats(v) {
  return (
    isObj(v) &&
    isIntIn(v.soulPoints, 0) &&
    isIntIn(v.streak, 0) &&
    isDay(v.lastStudyDay) &&
    isDay(v.todayDay) &&
    isIntIn(v.todaySessions, 0) &&
    isIntIn(v.todayMinutes, 0)
  );
}

/** @param {unknown} v @returns {boolean} */
export function isValidCard(v) {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.front === 'string' &&
    typeof v.back === 'string' &&
    isIntIn(v.missCount, 0)
  );
}

/** @param {unknown} v @returns {boolean} */
export function isValidDeck(v) {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.cards) &&
    v.cards.every(isValidCard)
  );
}

/** @param {unknown} v @returns {boolean} */
export function isValidDecks(v) {
  return isObj(v) && Array.isArray(v.decks) && v.decks.every(isValidDeck);
}

/**
 * Encode data into a versioned JSON envelope.
 * @param {unknown} data
 * @param {number} [version]
 * @returns {{ok:true, text:string} | {ok:false, reason:string}}
 */
export function encode(data, version = CURRENT_VERSION) {
  try {
    const text = JSON.stringify({ version, data });
    if (typeof text !== 'string') return { ok: false, reason: 'unserializable' };
    return { ok: true, text };
  } catch {
    return { ok: false, reason: 'unserializable' };
  }
}

/**
 * Decode a versioned envelope.
 * @param {unknown} text
 * @param {(data: unknown) => boolean} [validate]
 * @param {number[]} [supportedVersions]
 * @returns {{ok:true, data:any} | {ok:false, reason:string}}
 */
export function decode(text, validate, supportedVersions = [CURRENT_VERSION]) {
  try {
    if (typeof text !== 'string') return { ok: false, reason: 'invalid-json' };
    let env;
    try {
      env = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'invalid-json' };
    }
    if (!isObj(env) || !Number.isInteger(env.version) || !('data' in env)) {
      return { ok: false, reason: 'invalid-envelope' };
    }
    if (!supportedVersions.includes(env.version)) {
      return { ok: false, reason: 'unsupported-version' };
    }
    if (typeof validate === 'function' && !validate(env.data)) {
      return { ok: false, reason: 'invalid-shape' };
    }
    return { ok: true, data: env.data };
  } catch {
    return { ok: false, reason: 'invalid-shape' };
  }
}
