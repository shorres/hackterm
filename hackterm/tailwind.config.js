/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0f',
          surface: '#0f0f1a',
          border: '#1a1a2e',
          green: '#00ff41',
          'green-dim': '#00aa2b',
          'green-dark': '#004410',
          cyan: '#00ccff',
          orange: '#ff6b35',
          gold: '#ffd700',
          red: '#ff2244',
          gray: '#4a4a6a',
          white: '#c8c8e8',
        },
      },
      fontFamily: {
        mono: ['"Fira Code"', '"Cascadia Code"', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        'scan-line': 'scanLine 8s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
