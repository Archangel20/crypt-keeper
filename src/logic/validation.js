// Length validation for deck names, card text and quiz notes. Pure, never throws.

/** @typedef {{ok:true, value:string}} TextOk */
/** @typedef {{ok:false, field:string, message:string}} TextErr */

export const NAME_MAX = 100;
export const CARD_TEXT_MAX = 500;
export const NOTES_MIN = 200;
export const NOTES_MAX = 12000;

/**
 * @param {unknown} text
 * @param {string} field
 * @param {number} max
 * @returns {TextOk | TextErr}
 */
function validateTrimmed(text, field, max) {
  const label = field.charAt(0).toUpperCase() + field.slice(1);
  if (typeof text !== 'string') {
    return { ok: false, field, message: `${label} must be text.` };
  }
  const value = text.trim();
  if (value.length < 1) {
    return { ok: false, field, message: `${label} cannot be empty.` };
  }
  if (value.length > max) {
    return {
      ok: false,
      field,
      message: `${label} is too long (${value.length} characters, limit ${max}).`,
    };
  }
  return { ok: true, value };
}

/**
 * Deck name: trimmed length 1..100.
 * @param {unknown} text
 * @returns {TextOk | TextErr}
 */
export function validateName(text) {
  return validateTrimmed(text, 'name', NAME_MAX);
}

/**
 * Card side text: trimmed length 1..500.
 * @param {unknown} text
 * @param {'front'|'back'} [field]
 * @returns {TextOk | TextErr}
 */
export function validateCardText(text, field = 'front') {
  return validateTrimmed(text, field, CARD_TEXT_MAX);
}

/**
 * Study notes: untrimmed length 200..12000. Message includes count and limit.
 * @param {unknown} text
 * @returns {{ok:true, value:string} | {ok:false, field:'notes', message:string}}
 */
export function validateNotes(text) {
  if (typeof text !== 'string') {
    return { ok: false, field: 'notes', message: 'Notes must be text.' };
  }
  const count = text.length;
  if (count < NOTES_MIN) {
    return {
      ok: false,
      field: 'notes',
      message: `Notes are too short (${count} characters, minimum ${NOTES_MIN}).`,
    };
  }
  if (count > NOTES_MAX) {
    return {
      ok: false,
      field: 'notes',
      message: `Notes are too long (${count} characters, maximum ${NOTES_MAX}).`,
    };
  }
  return { ok: true, value: text };
}
