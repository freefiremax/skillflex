/**
 * The single serverless function behind every /api/* request.
 *
 * Named plainly, not `[...path].mjs`: Vercel only honours the `[...catchall]`
 * filename convention for framework presets, and this project sets
 * `framework: null`. As `[...path].mjs` it silently matched one segment only —
 * /api/health reached it, /api/auth/login got a platform 404. Routing is now an
 * explicit `rewrites` entry in vercel.json instead of a filename convention.
 *
 * It is deliberately a one-line re-export: the real handler is bundled from
 * TypeScript into apps/api/dist/vercel.mjs during the build (see `build:api` in
 * the root package.json). Bundling first is not optional — @skillswitch/db and
 * @skillswitch/shared are consumed as raw TypeScript, and Vercel's Node builder
 * will not compile TypeScript it finds inside node_modules.
 *
 * Both files are .mjs on purpose. The bundle is ESM, and a .js extension would
 * leave Node to infer that from the nearest package.json — which the function
 * bundle does not necessarily contain, since includeFiles ships apps/api/dist
 * and not apps/api/package.json. Node would then fall back to the root
 * package.json, which has no `type`, read the bundle as CommonJS, and throw on
 * the first import. .mjs is ESM unconditionally.
 */
export { default } from '../apps/api/dist/vercel.mjs'
