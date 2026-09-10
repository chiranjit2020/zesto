import { useEffect } from 'react';
import { usePrefs } from '../state/prefs';

/** Applies the user's theme choice to <html data-theme>. 'system' clears the attribute. */
export function useApplyTheme() {
  const theme = usePrefs((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta?.setAttribute('content', dark ? '#06090f' : '#f9fafc');
  }, [theme]);
}
