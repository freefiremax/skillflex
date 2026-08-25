/**
 * Vercel picks this up as a catch-all function for every /api/* request.
 *
 * It is deliberately a one-line re-export: the real handler is bundled from
 * TypeScript into apps/api/dist/vercel.js during the build (see `build:api` in
 * the root package.json). Bundling first is not optional — @skillswitch/db and
 * @skillswitch/shared are consumed as raw TypeScript, and Vercel's Node builder
 * will not compile TypeScript it finds inside node_modules.
 *
 * .mjs rather than .ts so nothing here needs type resolution against a file
 * that only exists after the build step has run.
 */
export { default } from '../apps/api/dist/vercel.js'
