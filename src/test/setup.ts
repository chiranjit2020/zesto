import '@testing-library/jest-dom/vitest';

// Node 22+'s own experimental global `localStorage` (behind --localstorage-file, unset
// here) shadows jsdom's working implementation when code references the bare
// `localStorage` identifier — exactly what zustand's `persist` middleware does. Without
// this, the first persisted store write in any test throws "Cannot read properties of
// undefined (reading 'setItem')". A tiny in-memory stand-in is all `persist` needs.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear = () => this.store.clear();
  getItem = (key: string) => this.store.get(key) ?? null;
  key = (index: number) => [...this.store.keys()][index] ?? null;
  removeItem = (key: string) => void this.store.delete(key);
  setItem = (key: string, value: string) => void this.store.set(key, value);
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

// jsdom lacks these — stub for components that touch them
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
