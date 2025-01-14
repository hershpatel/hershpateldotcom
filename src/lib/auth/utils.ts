import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { 
  type AuthEnv,
  type SessionData,
  type CookieConfig,
  authEnvSchema,
  AUTH_COOKIE_NAME,
} from "./types";

// Environment variable validation
export function getAuthEnv(): AuthEnv {
  const env = {
    SHH_PASSWORD_HASH: process.env.SHH_PASSWORD_HASH,
    SHH_SESSION_SECRET: process.env.SHH_SESSION_SECRET,
    SHH_SESSION_DURATION: process.env.SHH_SESSION_DURATION,
  };

  const result = authEnvSchema.safeParse(env);
  
  if (!result.success) {
    throw new Error("Missing or invalid environment variables");
  }

  return result.data;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) {
    console.error("No password hash provided for verification");
    return false;
  }

  try {
    const result = await bcrypt.compare(password, hash);
    return result;
  } catch (error) {
    console.error("[Auth Utils] Password verification error:", error);
    return false;
  }
}

// Cookie utilities
export function getCookieConfig(): CookieConfig {
  const env = getAuthEnv();
  return {
    name: AUTH_COOKIE_NAME,
    maxAge: env.SHH_SESSION_DURATION,
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "strict",
  };
}

// Session utilities
async function getSecretKey() {
  const env = getAuthEnv();
  if (!env.SHH_SESSION_SECRET) {
    throw new Error("Session secret is required");
  }
  return new TextEncoder().encode(env.SHH_SESSION_SECRET);
}

export async function createSessionData(): Promise<SessionData> {
  const env = getAuthEnv();
  const now = Date.now();
  return {
    iat: now,
    exp: now + env.SHH_SESSION_DURATION * 1000,
  };
}

export async function createSessionToken(data: SessionData): Promise<string> {
  const secretKey = await getSecretKey();
  return new SignJWT(data as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(data.iat)
    .setExpirationTime(data.exp)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const secretKey = await getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    const session = payload as SessionData;

    // Extra validation
    const now = Date.now();
    if (now > session.exp) {
      return null;
    }

    return session;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function getSessionData(request: NextRequest): Promise<SessionData | null> {
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }
  return verifySessionToken(sessionCookie.value);
}

export async function createSessionCookie(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const config = getCookieConfig();
  const token = await createSessionToken(data);
  
  cookieStore.set(config.name, token, {
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
