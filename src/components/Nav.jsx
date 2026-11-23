const NAV_ITEMS = [
  { id: 'crypt', label: 'Crypt' },
  { id: 'candle', label: 'Candle' },
  { id: 'grimoire', label: 'Grimoire' },
  { id: 'seance', label: 'Seance' },
];

/**
 * @param {{ screen: string, onNavigate: (screen: string) => void }} props
 */
export default function Nav({ screen, onNavigate }) {
  return (
    <nav className="nav" aria-label="Primary navigation">
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          className={`nav__item${screen === id ? ' is-active' : ''}`}
          key={id}
          type="button"
          aria-current={screen === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export { NAV_ITEMS };
