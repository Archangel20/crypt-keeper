import { useEffect, useState } from 'react';
import { isAvailable } from '../services/storageService.js';

const STORAGE_CHECK_INTERVAL_MS = 250;
const MESSAGE = 'Progress may not be saved';

/**
 * @param {{error?: unknown, status?: {error?: unknown}|null}} props
 * @returns {boolean}
 */
function hasStorageError({ error, status }) {
  return Boolean(error || status?.error);
}

/**
 * Announces storage failures without requiring each screen to own a banner.
 * Screens can pass their existing useStorage status, while the availability
 * check covers failures detected at the app shell boundary.
 *
 * @param {{error?: unknown, status?: {error?: unknown}|null}} props
 */
export default function StorageBanner({ error, status }) {
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  useEffect(() => {
    const checkStorage = () => {
      setStorageUnavailable(!isAvailable());
    };

    checkStorage();
    const intervalId = setInterval(checkStorage, STORAGE_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  if (!hasStorageError({ error, status }) && !storageUnavailable) return null;

  return (
    <div
      className="storage-banner"
      role="status"
      aria-live="polite"
      style={{ position: 'relative', zIndex: 3 }}
    >
      {MESSAGE}
    </div>
  );
}

export { MESSAGE, STORAGE_CHECK_INTERVAL_MS };
