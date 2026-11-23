import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Default is node (jsdom loads too slowly). Screen/component tests must opt in
    // with `// @vitest-environment jsdom` at the top of their own file.
    environment: 'node',
    fileParallelism: false,
    pool: 'threads',
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
