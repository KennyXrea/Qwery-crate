import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'supabase/.temp', 'src/types/database.ts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Project rule: React escapes text for us; raw HTML injection is never allowed.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is not allowed in this project.',
        },
      ],
      // src/lib/zod.ts configures zod before any schema exists (no eval() probe, for the CSP).
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'zod', message: "Import { z } from 'src/lib/zod' instead." }],
          patterns: [{ group: ['zod/*'], message: "Import { z } from 'src/lib/zod' instead." }],
        },
      ],
    },
  },
  {
    files: ['src/lib/zod.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Node-side files: Vite config and helper scripts run with tsx.
    files: ['vite.config.ts', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
