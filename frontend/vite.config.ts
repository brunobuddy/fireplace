/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

// In dev the SPA is served by Vite and the API/websocket live on the NestJS
// backend, so proxy `/api` + `/socket.io` there — the app then uses the same
// relative origin it does in production (where NestJS serves the SPA itself).
// `VITE_BACKEND_PORT` lets `/serve` point the proxy at a random backend port.
const backendPort = process.env.VITE_BACKEND_PORT ?? '3000';
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/socket.io': { target: backendTarget, ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    deps: { optimizer: { web: { include: ['@solidjs/testing-library'] } } },
  },
});
