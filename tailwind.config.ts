import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dex: {
          red: '#CC0000',
          darkred: '#990000',
          black: '#1a1a1a',
          screen: '#9bbc0f',
          'screen-dark': '#0f380f',
          gray: '#2d2d2d',
          light: '#f5f5f5',
        },
      },
      fontFamily: {
        mono: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
