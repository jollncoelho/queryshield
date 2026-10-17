import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#090A0F',
          900: '#0B0D14',
          850: '#12151E',
          800: '#181C27',
          700: '#1E2330',
          600: '#2A3140',
        },
        line: {
          DEFAULT: '#1E2330',
          soft: '#171B26',
          strong: '#2A3140',
        },
        brand: {
          300: '#7CF9FF',
          400: '#3FEAF9',
          500: '#00F2FE',
          600: '#00C2CE',
          700: '#00929C',
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
