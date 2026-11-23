import React, { useCallback, useState } from 'react';
import FogLayer from './components/FogLayer.jsx';
import Nav from './components/Nav.jsx';
import ScreenErrorBoundary from './components/ScreenErrorBoundary.jsx';
import StorageBanner from './components/StorageBanner.jsx';
import CandleScreen from './screens/CandleScreen.jsx';
import CryptScreen from './screens/CryptScreen.jsx';
import GrimoireScreen from './screens/GrimoireScreen.jsx';
import SeanceScreen from './screens/SeanceScreen.jsx';

const SCREEN_COMPONENTS = Object.freeze({
  crypt: CryptScreen,
  candle: CandleScreen,
  grimoire: GrimoireScreen,
  seance: SeanceScreen,
});

const SCREEN_NAMES = new Set(Object.keys(SCREEN_COMPONENTS));

/**
 * @param {{storageError?: unknown, storageStatus?: {error?: unknown}|null}} props
 */
export default function App({ storageError, storageStatus } = {}) {
  const [screen, setScreen] = useState('crypt');
  const [lastGoodScreen, setLastGoodScreen] = useState('crypt');
  const [navigationAttempt, setNavigationAttempt] = useState(0);

  const navigate = useCallback((nextScreen) => {
    if (!SCREEN_NAMES.has(nextScreen)) return;

    setScreen(nextScreen);
    setNavigationAttempt((attempt) => attempt + 1);
  }, []);

  const handleScreenLoaded = useCallback((loadedScreen) => {
    setLastGoodScreen((previousScreen) => (
      previousScreen === loadedScreen ? previousScreen : loadedScreen
    ));
  }, []);

  const handleScreenError = useCallback((previousScreen) => {
    setScreen(previousScreen);
  }, []);

  const renderScreen = useCallback((screenName) => {
    const Screen = SCREEN_COMPONENTS[screenName] || CryptScreen;
    return <Screen onNavigate={navigate} />;
  }, [navigate]);

  return (
    <div className="app-shell">
      <FogLayer />
      <StorageBanner error={storageError} status={storageStatus} />
      <Nav screen={screen} onNavigate={navigate} />
      <main>
        <ScreenErrorBoundary
          key={navigationAttempt}
          screen={screen}
          previousScreen={lastGoodScreen}
          onError={handleScreenError}
          onScreenLoaded={handleScreenLoaded}
          renderScreen={renderScreen}
        />
      </main>
    </div>
  );
}

export { SCREEN_COMPONENTS };
