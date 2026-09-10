import { useCallback, useEffect, useRef, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Screen Wake Lock for cooking mode — the screen shouldn't sleep mid-recipe. */
export function useWakeLock(active: boolean) {
  const ref = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    let cancelled = false;
    const request = async () => {
      try {
        if ('wakeLock' in navigator && active) {
          ref.current = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request(
            'screen',
          );
        }
      } catch {
        /* denied / unsupported — not fatal */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && active && !cancelled) request();
    };
    if (active) {
      request();
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      ref.current?.release().catch(() => {});
      ref.current = null;
    };
  }, [active]);
}

export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const target = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((target.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* noop */
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => {
    target.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }, []);
  const stop = useCallback(() => setRunning(false), []);

  return { remaining, running, start, stop };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/** local time bucket — powers the "it's 1:17 AM" Midnight prompt */
export function useClock(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function isLateNight(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 23 || h < 5;
}
