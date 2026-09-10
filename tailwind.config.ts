import type { Config } from 'tailwindcss';

/**
 * Zesto design system — tokens.
 * Colours are driven by CSS custom properties (see src/styles/tokens.css) so light /
 * dark / midnight surfaces all resolve from the same names. Vite-inspired: electric
 * blue + vivid purple over deep ink. Colour is used for meaning, not decoration.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--z-ink) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--z-surface) / <alpha-value>)',
          raised: 'rgb(var(--z-surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--z-surface-sunken) / <alpha-value>)',
        },
        line: 'rgb(var(--z-line) / <alpha-value>)',
        content: {
          DEFAULT: 'rgb(var(--z-text) / <alpha-value>)',
          muted: 'rgb(var(--z-text-muted) / <alpha-value>)',
          faint: 'rgb(var(--z-text-faint) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--z-brand) / <alpha-value>)',
          blue: 'rgb(var(--z-blue) / <alpha-value>)',
          purple: 'rgb(var(--z-purple) / <alpha-value>)',
        },
        positive: 'rgb(var(--z-positive) / <alpha-value>)',
        caution: 'rgb(var(--z-caution) / <alpha-value>)',
        critical: 'rgb(var(--z-critical) / <alpha-value>)',
        'on-brand': 'rgb(var(--z-on-brand) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Quicksand', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // 1.20 modular scale
        '2xs': ['0.694rem', { lineHeight: '1rem' }],
        xs: ['0.833rem', { lineHeight: '1.1rem' }],
        sm: ['0.9rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.2rem', { lineHeight: '1.6rem' }],
        xl: ['1.44rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.728rem', { lineHeight: '1.9rem' }],
        '3xl': ['2.074rem', { lineHeight: '2.25rem' }],
        display: ['clamp(2rem, 1.4rem + 3vw, 2.99rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.35rem',
        '2xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
        pop: '0 8px 40px -8px rgb(0 0 0 / 0.35)',
        glow: '0 0 0 1px rgb(var(--z-brand) / 0.35), 0 8px 30px -6px rgb(var(--z-brand) / 0.45)',
      },
      spacing: {
        18: '4.5rem',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      transitionTimingFunction: {
        zesto: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'z-draw': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        'rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'z-draw': 'z-draw 1.1s var(--z-ease, ease) forwards',
        rise: 'rise 0.28s var(--z-ease, ease) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
