import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config([
  {
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'packages/*/scripts/**' // Skip build scripts that use CommonJS patterns
    ]
  },
  // Backend TypeScript files
  {
    files: ['packages/backend/src/**/*.ts', 'packages/cli/src/**/*.ts', 'shared/**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'error',
    },
  },
  // Frontend TypeScript/React files
  {
    files: ['packages/frontend/src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Special rules for contexts and settings
  {
    files: ['packages/frontend/src/**/contexts/*.{ts,tsx}', 'packages/frontend/src/**/modals/SettingsPage.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])