import { candleHeightPercent } from '../logic/candleHeight.js';

const BODY = Object.freeze({
  x: 70,
  bottom: 220,
  width: 60,
  fullHeight: 150,
});

/**
 * Render the candle's current remaining height and flame state.
 *
 * @param {{ remainingMs: number, totalMs: number, status: 'idle'|'running'|'paused' }} props
 */
export default function CandleVisual({ remainingMs, totalMs, status }) {
  const remainingPercent = candleHeightPercent(remainingMs, totalMs);
  const bodyHeight = (BODY.fullHeight * remainingPercent) / 100;
  const bodyY = BODY.bottom - bodyHeight;
  const flameVisible =
    status === 'running'
    && typeof remainingMs === 'number'
    && Number.isFinite(remainingMs)
    && remainingMs > 0;
  const accessiblePercent = Math.round(remainingPercent);

  return (
    <svg
      className="candle-visual"
      role="img"
      aria-label={`Candle, ${accessiblePercent} percent remaining`}
      viewBox="0 0 200 240"
      width="200"
      height="240"
    >
      <title>{`Candle, ${accessiblePercent} percent remaining`}</title>
      <defs>
        <linearGradient id="candle-wax-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#b57b3a" />
          <stop offset="18%" stopColor="var(--candle-wax)" />
          <stop offset="72%" stopColor="#f5d990" />
          <stop offset="100%" stopColor="#a66d33" />
        </linearGradient>
      </defs>
      <rect
        className="candle__body"
        x={BODY.x}
        y={bodyY}
        width={BODY.width}
        height={bodyHeight}
        rx="8"
        fill="url(#candle-wax-gradient)"
      />
      <rect
        className="candle__wick"
        x="98"
        y="45"
        width="4"
        height="20"
        rx="2"
        fill="var(--color-text)"
      />
      {flameVisible ? (
        <path
          className="candle__flame"
          aria-hidden="true"
          fill="var(--flame-core)"
          d="M100 65C86 82 87 98 100 105C113 98 114 82 100 65Z"
        />
      ) : null}
    </svg>
  );
}

export { BODY };
