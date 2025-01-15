import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    CLOUDFRONT_URL: z.string().url(),
    HERSHEY_PHOTOS_IAM_USER: z.string(),
    HERSHEY_PHOTOS_S3_BUCKET: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SHH_PASSWORD_HASH: z.string()
      .min(1)
      .refine(
        (hash) => hash.startsWith('$2a$') || hash.startsWith('$2b$'),
        'Password hash must be a valid bcrypt hash starting with $2a$ or $2b$'
      ),
    SHH_SESSION_SECRET: z.string().min(32),
    SHH_SESSION_DURATION: z.coerce.number().int().positive().default(86400),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {},

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    CLOUDFRONT_URL: process.env.CLOUDFRONT_URL,
    NODE_ENV: process.env.NODE_ENV,
    HERSHEY_PHOTOS_IAM_USER: process.env.HERSHEY_PHOTOS_IAM_USER,
    HERSHEY_PHOTOS_S3_BUCKET: process.env.HERSHEY_PHOTOS_S3_BUCKET,
    SHH_PASSWORD_HASH: process.env.SHH_PASSWORD_HASH,
    SHH_SESSION_SECRET: process.env.SHH_SESSION_SECRET,
    SHH_SESSION_DURATION: process.env.SHH_SESSION_DURATION,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
