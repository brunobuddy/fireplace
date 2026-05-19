/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    deps: { optimizer: { web: { include: ['@solidjs/testing-library'] } } },
  },
});
