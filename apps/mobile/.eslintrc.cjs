module.exports = {
  root: true,
  env: {
    'react-native/react-native': true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['node_modules', '.expo', 'dist', '.eslintrc.cjs', 'babel.config.js', 'metro.config.js', 'tailwind.config.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-native'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'off', // Allow require() for React Native assets
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'off',
    'react-native/no-inline-styles': 'off', // NativeWind uses className, not inline styles
  },
  overrides: [
    {
      // Allow 'any' type in test files
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx', '**/test/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
}
