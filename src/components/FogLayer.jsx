/**
 * Decorative background fog. It is intentionally removed from the
 * accessibility tree and cannot intercept input meant for the app.
 */
export default function FogLayer() {
  return <div className="fog-layer" aria-hidden="true" />;
}
