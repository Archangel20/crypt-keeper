import { useStats } from '../hooks/useStats.js';

const DESTINATIONS = Object.freeze([
  { id: 'candle', label: 'Candle' },
  { id: 'grimoire', label: 'Grimoire' },
  { id: 'seance', label: 'Seance' },
]);

/**
 * Render the home screen stats and links to the three study features.
 *
 * @param {{onNavigate?: (screen: string) => void}} props
 */
export default function CryptScreen({ onNavigate = () => {} }) {
  const {
    stats,
    loadError,
    saveError,
  } = useStats();

  const navigate = (event, destination) => {
    event.preventDefault();
    onNavigate(destination);
  };

  return (
    <section aria-labelledby="crypt-screen-title">
      <h1 id="crypt-screen-title">Crypt</h1>

      {loadError ? <p role="alert">{loadError}</p> : null}
      {saveError ? <p role="alert">{saveError}</p> : null}

      <section aria-labelledby="crypt-stats-title">
        <h2 id="crypt-stats-title">Study stats</h2>
        <dl>
          <div>
            <dt>Soul Points</dt>
            <dd>{stats.soulPoints}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{stats.streak} days</dd>
          </div>
          <div>
            <dt>Today Sessions</dt>
            <dd>{stats.todaySessions} sessions</dd>
          </div>
          <div>
            <dt>Today Minutes</dt>
            <dd>{stats.todayMinutes} minutes</dd>
          </div>
        </dl>
      </section>

      <nav aria-label="Crypt destinations">
        {DESTINATIONS.map(({ id, label }) => (
          <a
            href={`#${id}`}
            key={id}
            onClick={(event) => navigate(event, id)}
          >
            {label}
          </a>
        ))}
      </nav>
    </section>
  );
}

export { DESTINATIONS };
