import type { Config } from 'tailwindcss';

/**
 * Design tokens live as RGB triplets in src/index.css so that light/dark
 * themes swap by toggling the `dark` class, and Tailwind opacity modifiers
 * (e.g. bg-surface/60) keep working.
 */
const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: withVar('--c-page'),
        surface: withVar('--c-surface'),
        sunken: withVar('--c-sunken'),
        ink: withVar('--c-ink'),
        muted: withVar('--c-muted'),
        faint: withVar('--c-faint'),
        line: withVar('--c-line'),
        accent: withVar('--c-accent'),
        'accent-ink': withVar('--c-accent-ink'),
        'accent-soft': withVar('--c-accent-soft'),
        'on-accent': withVar('--c-on-accent'),
        gilt: withVar('--c-gilt'),
        danger: withVar('--c-danger'),
        'danger-soft': withVar('--c-danger-soft'),
        ok: withVar('--c-ok'),
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: [
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          'Palatino',
          'Georgia',
          'serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04)',
        lift: '0 8px 24px -8px rgb(0 0 0 / 0.18)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'scale-in': 'scale-in 150ms ease-out both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
