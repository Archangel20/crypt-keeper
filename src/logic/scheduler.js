// Study queue scheduling. Pure, never throws, never mutates inputs; randomness is injected.

/** @typedef {{id:string, front:string, back:string, missCount:number}} Card */
/** @typedef {{cardId:string, confirmed:boolean, missedThisSession:boolean}} QueueEntry */

/**
 * Initial queue: higher missCount first, random order among equals.
 * @param {Card[]} cards
 * @param {() => number} rng returns a number in [0, 1)
 * @returns {QueueEntry[]}
 */
export function buildQueue(cards, rng) {
  if (!Array.isArray(cards)) return [];
  const next = typeof rng === 'function' ? rng : () => 0.5;

  const items = cards
    .filter((c) => c && typeof c === 'object')
    .map((c) => ({
      id: c.id,
      miss: Number.isFinite(c.missCount) ? c.missCount : 0,
    }));

  // Fisher-Yates shuffle, then stable sort by missCount descending:
  // equal counts keep their shuffled (random) relative order.
  for (let i = items.length - 1; i > 0; i--) {
    let r = Number(next());
    if (!Number.isFinite(r) || r < 0 || r >= 1) r = 0;
    const j = Math.floor(r * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.sort((a, b) => b.miss - a.miss);

  return items.map((it) => ({
    cardId: it.id,
    confirmed: false,
    missedThisSession: false,
  }));
}

/**
 * Apply a result to the head entry (index 0) of the queue.
 * missed: clear confirmed, set missedThisSession, reinsert 1-3 positions after current.
 * got on a clean or confirmed entry: remove.
 * got on a missed, unconfirmed entry: confirm and reinsert 5 positions after current.
 * @param {QueueEntry[]} queue
 * @param {'got'|'missed'} result
 * @param {() => number} rng returns a number in [0, 1)
 * @returns {{queue: QueueEntry[], removed: boolean}}
 */
export function applyResult(queue, result, rng) {
  if (!Array.isArray(queue) || queue.length === 0) {
    return { queue: Array.isArray(queue) ? [...queue] : [], removed: false };
  }
  const head = queue[0];
  const rest = queue.slice(1);
  if (!head || typeof head !== 'object' || (result !== 'got' && result !== 'missed')) {
    return { queue: [...queue], removed: false };
  }

  const insertAt = (index, entry) => {
    const k = Math.max(0, Math.min(index, rest.length));
    return { queue: [...rest.slice(0, k), entry, ...rest.slice(k)], removed: false };
  };

  if (result === 'missed') {
    let r = Number(typeof rng === 'function' ? rng() : 0);
    if (!Number.isFinite(r) || r < 0 || r >= 1) r = 0;
    const k = Math.floor(r * 3); // 0..2; index into `rest` is k + 1 => 1 to 3 positions after current
    return insertAt(k + 1, { ...head, confirmed: false, missedThisSession: true });
  }

  if (!head.missedThisSession || head.confirmed) {
    return { queue: rest, removed: true };
  }
  return insertAt(4, { ...head, confirmed: true });
}
