import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { findPublishedSecrets } from './src/lib/env-keys.ts'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    // Vite copies VITE_ variables into the public JavaScript at build time, so a secret key in
    // one of them would be published with the site. The in-browser check in src/lib/env.ts comes
    // too late for that, so stop the build here instead. loadEnv reads the .env files AND the
    // real environment, so variables set in Netlify's dashboard are checked too. (Only for
    // builds: in dev, the friendly configuration page explains the problem.)
    const problems = findPublishedSecrets(loadEnv(mode, process.cwd(), 'VITE_'))
    if (problems.length > 0) {
      throw new Error(
        [
          'Build stopped so a secret key is not published:',
          ...problems.map((problem) => `  - ${problem}`),
          'Only the publishable (or "anon public") key may go in VITE_ variables. Remove the secret one.',
        ].join('\n'),
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    // Tests only (Vitest runs in "test" mode). Vitest resolves packages with the "node"
    // condition, which picks react-router's CommonJS build for `import 'react-router'`.
    // But that build's `react-router/dom` entry calls `require('react-router')`, and Node
    // (22.12+) resolves that through the "module-sync" condition to the ES module build:
    // two copies of the router whose contexts don't match, so rendering <App /> in a test
    // crashed ("useRouteError must be used within a data router"). Adding "module-sync"
    // makes Vite pick the same files Node does. Dev and production builds are unaffected.
    resolve: mode === 'test' ? { conditions: ['module-sync'] } : undefined,
    server: {
      // Supabase Auth redirect URLs point at 5173, so fail loudly instead of silently
      // moving to another port if it's already taken.
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  }
})
