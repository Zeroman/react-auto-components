/**
 * `process.env.NODE_ENV` as the consuming bundler defines it. The library
 * build leaves that expression in place for Vite/webpack to replace; a
 * runtime that loads the ESM output directly (import maps, CDN) has no
 * `process` global at all, so every read goes through these constants
 * instead of touching `process` during render or in effects.
 */
const nodeEnv: string | undefined =
  typeof process === "undefined" ? undefined : process.env.NODE_ENV;

/** True in production builds. Never throws where `process` does not exist. */
export const isProductionBuild = nodeEnv === "production";

/** Development bundles outside test runs: `RacError` also logs to the console there. */
export const logsDevErrors = !isProductionBuild && nodeEnv !== "test";
