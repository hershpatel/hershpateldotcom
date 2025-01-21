/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    domains: [new URL(env.CLOUDFRONT_URL).hostname],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days in seconds
  },
};

export default config;
