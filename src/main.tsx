import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Lab } from './lab/Lab';

// Phase 1: the lab is the whole app. Phase 2 swaps in the game and keeps the lab at ?lab.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
);
