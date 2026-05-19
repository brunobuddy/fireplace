import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement randomUUID on older versions — make it deterministic
// enough for the optimistic-add path used in tests.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => `test-${Math.random().toString(16).slice(2)}` },
  });
}
