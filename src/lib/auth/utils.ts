import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { 
  type AuthEnv,
  type SessionData,
  type CookieConfig,
  authEnvSchema,
  AUTH_COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "./types";

// Environment variable validation
export function getAuthEnv(): AuthEnv {
  const env = {
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SESSION_DURATION: process.env.SESSION_DURATION,
  };

  const result = authEnvSchema.safeParse(env);
  
  if (!result.success) {
    throw new Error("Missing or invalid environment variables");
  }

  return result.data;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 5);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Cookie utilities
export function getCookieConfig(): CookieConfig {
  return {
    name: AUTH_COOKIE_NAME,
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "strict",
  };
}

export function getSessionData(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  try {
    const data = JSON.parse(atob(sessionCookie.value)) as SessionData;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export async function createSessionCookie(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const config = getCookieConfig();
  
  cookieStore.set(config.name, btoa(JSON.stringify(data)), {
    maxAge: config.maxAge,
    httpOnly: config.httpOnly,
    secure: config.secure,
    path: config.path,
    sameSite: config.sameSite,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

// Session utilities
export function createSessionData(): SessionData {
  const now = Date.now();
  return {
    iat: now,
    exp: now + COOKIE_MAX_AGE * 1000,
  };
}
