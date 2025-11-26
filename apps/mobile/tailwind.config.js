/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary - match web (dark theme)
        primary: {
          DEFAULT: '#0a0a0a',
          foreground: '#fafafa',
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        // Action type colors - match web exactly
        routine: {
          DEFAULT: '#3b82f6',
          light: '#eff6ff',
        },
        mission: {
          DEFAULT: '#10b981',
          light: '#f0fdf4',
        },
        reference: {
          DEFAULT: '#f59e0b',
          light: '#fffbeb',
        },
        // Semantic colors - match web
        muted: {
          DEFAULT: '#f4f4f5',
          foreground: '#71717a',
        },
        border: '#e4e4e7',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0a0a0a',
        },
        // Accent colors
        accent: {
          DEFAULT: '#764ba2',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
    },
  },
  plugins: [],
}
