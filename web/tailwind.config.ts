import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sf: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Dynamische HIG-Farben: hell per Default, dunkel via prefers-color-scheme
        // (siehe CSS-Variablen in app/globals.css). rgb(... / <alpha-value>)
        // hält Tailwinds Opacity-Modifier (z.B. bg-ios-blue/15) funktionsfähig.
        surface: 'rgb(var(--c-bg) / <alpha-value>)',
        'surface-secondary': 'rgb(var(--c-bg-secondary) / <alpha-value>)',
        'surface-tertiary': 'rgb(var(--c-bg-tertiary) / <alpha-value>)',
        label: 'rgb(var(--c-label) / <alpha-value>)',
        'label-secondary': 'rgb(var(--c-label-secondary) / 0.6)',
        separator: 'rgb(var(--c-separator) / var(--c-separator-alpha))',
        ios: {
          blue: 'rgb(var(--c-blue) / <alpha-value>)',
          green: 'rgb(var(--c-green) / <alpha-value>)',
          red: 'rgb(var(--c-red) / <alpha-value>)',
          orange: 'rgb(var(--c-orange) / <alpha-value>)',
          yellow: '#FFD60A',
          purple: '#BF5AF2',
          indigo: '#5E5CE6',
          teal: '#40C8E0',
          pink: '#FF375F',
          // Neutrale Graustufen für kleine, absichtlich nicht invertierte
          // Chrome-Elemente (Switch-Track, Spinner-Rand, o.ä.).
          gray: {
            50: '#F2F2F7',
            100: '#E5E5EA',
            200: '#D1D1D6',
            300: '#C7C7CC',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#3A3A3C',
            900: '#2C2C2E',
            950: '#1C1C1E',
          },
        },
      },
      borderRadius: {
        ios: '14px',
        'ios-lg': '20px',
        'ios-xl': '28px',
      },
      boxShadow: {
        ios: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.28)',
        'ios-sm': '0 1px 3px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        ios: '20px',
      },
      keyframes: {
        'ios-spin': { to: { transform: 'rotate(360deg)' } },
        'sheet-up': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(1.2)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'ios-spin': 'ios-spin 0.9s linear infinite',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.25, 1, 0.4, 1)',
        pop: 'pop 0.25s cubic-bezier(0.25, 1, 0.4, 1)',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        shake: 'shake 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
