import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070A11',
          900: '#0A0E17',
          850: '#0E1420',
          800: '#121A29',
          700: '#182238',
          600: '#1F2C46',
        },
        line: {
          DEFAULT: '#1E2A42',
          soft: '#162034',
          strong: '#2A3A5C',
        },
        brand: {
          400: '#5EB8FF',
          500: '#2E9BF0',
          600: '#1D7FD1',
          700: '#155E9E',
        },
        risk: {
          safe: '#22C55E',
          low: '#84CC16',
          suspicious: '#F59E0B',
          dangerous: '#EF4444',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
