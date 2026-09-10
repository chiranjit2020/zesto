/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
}
interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

