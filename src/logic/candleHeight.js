// Candle height helper. Pure, never throws.

/**
 * Candle height as a percentage of the full candle.
 * If totalMs is not a finite number > 0, returns 100.
 * A non-finite remainingMs is treated as 0.
 * @param {number} remainingMs
 * @param {number} totalMs
 * @returns {number} percentage in [0, 100]
 */
export function candleHeightPercent(remainingMs, totalMs) {
  if (typeof totalMs !== 'number' || !Number.isFinite(totalMs) || totalMs <= 0) return 100;
  const remaining =
    typeof remainingMs === 'number' && Number.isFinite(remainingMs) ? remainingMs : 0;
  const pct = (remaining / totalMs) * 100;
  return Math.min(100, Math.max(0, pct));
}
