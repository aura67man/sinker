/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://<user>.github.io/sinker/ on GitHub Pages,
// so built assets need the /sinker/ prefix (and `vite preview` serves the
// build the same way). The dev server just uses "/".
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/sinker/' : '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
