/**
 * The one place the app imports zod from (ESLint enforces this). Always write
 * `import { z } from '../lib/zod'`, never `from 'zod'`.
 *
 * zod 4 normally probes whether it may compile code with `new Function()` the first time an
 * object schema is built. The Content Security Policy added in Phase 6 forbids that
 * ('unsafe-eval'), so every page would log a CSP violation. `jitless` turns the probe off.
 * It has to run before any schema is created, which importing zod from here guarantees.
 */
import { z } from 'zod'

z.config({ jitless: true })

export { z }
