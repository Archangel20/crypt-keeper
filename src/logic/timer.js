// Timer helpers: minutes input parsing and MM:SS formatting. Pure, never throws.

import { defaultSettings } from './storageCodec.js';

export { defaultSettings };

const LIMITS = Object.freeze({ study: 120, break: 60 });

/**
 * Parse a minutes input for a session kind. Accepts only whole numbers
 * (number or numeric string) in 1..120 for study and 1..60 for break.
 * @param {unknown} input
 * @param {'study'|'break'} kind
 * @returns {{ok:true, value:number} | {ok:false, message:string}}
 */
export function parseMinutes(input, kind) {
  const max = kind === 'break' ? LIMITS.break : LIMITS.study;
  const message = `Enter a whole number of minutes from 1 to ${max}.`;
  let n;
  if (typeof input === 'number') {
    n = input;
  } else if (typeof input === 'string' && /^\s*\d+\s*$/.test(input)) {
    n = Number(input.trim());
  } else {
    return { ok: false, message };
  }
  if (!Number.isInteger(n) || n < 1 || n > max) return { ok: false, message };
  return { ok: true, value: n };
}

/**
 * Format remaining milliseconds as "MM:SS", rounded up to the next whole second.
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatMMSS(remainingMs) {
  const ms = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;
  const total = Math.ceil(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ---- State transitions. Pure and immutable; `now` is always passed in. ----

/** @typedef {{mode:'study'|'break', status:'idle'|'running'|'paused', remainingMs:number, endTimestamp:number|null}} TimerState */

function num(v, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function fullLengthMs(mode, settings) {
  const s = settings && typeof settings === 'object' ? settings : defaultSettings;
  const key = mode === 'break' ? 'breakMinutes' : 'studyMinutes';
  const minutes = num(s[key], defaultSettings[key]);
  return minutes * 60 * 1000;
}

function safeState(state) {
  const s = state && typeof state === 'object' ? state : {};
  return {
    mode: s.mode === 'break' ? 'break' : 'study',
    status: s.status === 'running' || s.status === 'paused' ? s.status : 'idle',
    remainingMs: Math.max(0, num(s.remainingMs)),
    endTimestamp: typeof s.endTimestamp === 'number' && Number.isFinite(s.endTimestamp) ? s.endTimestamp : null,
  };
}

/** Create an idle state at full length of the given mode. */
export function createTimerState(settings, mode = 'study') {
  const m = mode === 'break' ? 'break' : 'study';
  return { mode: m, status: 'idle', remainingMs: fullLengthMs(m, settings), endTimestamp: null };
}

/** Start or resume: endTimestamp = now + remainingMs. */
export function start(state, now) {
  const s = safeState(state);
  if (s.status === 'running') return s;
  return { ...s, status: 'running', endTimestamp: num(now) + s.remainingMs };
}

/** Pause a running timer, freezing remainingMs. */
export function pause(state, now) {
  const s = safeState(state);
  if (s.status !== 'running') return s;
  const end = s.endTimestamp === null ? num(now) + s.remainingMs : s.endTimestamp;
  return { ...s, status: 'paused', remainingMs: Math.max(0, end - num(now)), endTimestamp: null };
}

/** Back to idle at the full length of the current mode. */
export function reset(state, settings) {
  const s = safeState(state);
  return { mode: s.mode, status: 'idle', remainingMs: fullLengthMs(s.mode, settings), endTimestamp: null };
}

/** Recompute remaining time from endTimestamp while running. */
export function tick(state, now) {
  const s = safeState(state);
  if (s.status !== 'running' || s.endTimestamp === null) return s;
  return { ...s, remainingMs: Math.max(0, s.endTimestamp - num(now)) };
}

/** True when running and no time remains. */
export function isFinished(state) {
  const s = safeState(state);
  return s.status === 'running' && s.remainingMs === 0;
}

/** Switch to the other mode, idle, at that mode's full length. */
export function completeSession(state, settings) {
  const s = safeState(state);
  const mode = s.mode === 'study' ? 'break' : 'study';
  return { mode, status: 'idle', remainingMs: fullLengthMs(mode, settings), endTimestamp: null };
}

/** After a settings change: if not running, adopt the new full length. */
export function applyLengthChange(state, settings) {
  const s = safeState(state);
  if (s.status === 'running') return s;
  return { ...s, remainingMs: fullLengthMs(s.mode, settings), endTimestamp: null };
}
