import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    coverage: {
      thresholds: { branches: 70, functions: 70, lines: 70, statements: 70 },
    },
  },
});
