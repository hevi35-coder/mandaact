/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // Pretendard font family
        pretendard: ['Pretendard-Regular'],
        'pretendard-medium': ['Pretendard-Medium'],
        'pretendard-semibold': ['Pretendard-SemiBold'],
        'pretendard-bold': ['Pretendard-Bold'],
      },
      fontSize: {
        // Custom typography scale for better readability
        // Minimum size is 12px (xs) for accessibility
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
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
