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

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
