import { z } from "zod";

// Environment variable schema
export const authEnvSchema = z.object({
  ADMIN_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  SESSION_DURATION: z.coerce.number().int().positive(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

// Session data structure
export interface SessionData {
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

// Cookie configuration
export interface CookieConfig {
  name: string;
  maxAge: number;
  httpOnly: true;
  secure: true;
  path: "/";
  sameSite: "strict";
}

// API response types
export interface AuthResponse {
  success: boolean;
  error?: string;
}

// Constants
export const AUTH_COOKIE_NAME = "shh_session";
export const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds
