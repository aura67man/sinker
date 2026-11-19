import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import './styles/global.css';
import { App } from './App';
// After App, so it lands after every screen's stylesheet.
import './styles/polish.css';

// ?lab opens the Phase 1 test bench instead of the game. Lazy, so its
// styles never load in the real game.
const Lab = lazy(() => import('./lab/Lab').then((m) => ({ default: m.Lab })));
const showLab = new URLSearchParams(location.search).has('lab');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showLab ? (
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
