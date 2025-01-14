import { z } from "zod";
import { NextResponse } from "next/server";

import { type AuthResponse } from "~/lib/auth/types";
import {
  verifyPassword,
  getAuthEnv,
  createSessionData,
  createSessionCookie,
} from "~/lib/auth/utils";

// Rate limiting
const RATE_LIMIT = {
  MAX_ATTEMPTS: 10,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const;

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

// Use WeakMap to allow garbage collection of IP strings
const rateLimitMap = new Map<string, RateLimitEntry>();

// Request validation
const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

function getRateLimitEntry(ip: string): RateLimitEntry {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  // Clean up expired entries
  if (entry && entry.resetAt <= now) {
    rateLimitMap.delete(ip);
    entry = undefined;
  }

  // Create new entry if none exists
  if (!entry) {
    entry = {
      attempts: 0,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    };
    rateLimitMap.set(ip, entry);
  }

  return entry;
}

function isRateLimited(ip: string): boolean {
  const entry = getRateLimitEntry(ip);
  return entry.attempts >= RATE_LIMIT.MAX_ATTEMPTS;
}

function incrementRateLimit(ip: string): void {
  const entry = getRateLimitEntry(ip);
  entry.attempts += 1;
  rateLimitMap.set(ip, entry);
}

export async function POST(request: Request): Promise<NextResponse<AuthResponse>> {
  const startTime = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  try {
    console.info(`[Auth] Login attempt from ${ip}`);

    // Check rate limit
    if (isRateLimited(ip)) {
      console.warn(`[Auth] Rate limit exceeded for ${ip}`);
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Validate request body
    const result = loginSchema.safeParse(await request.json());
    if (!result.success) {
      console.warn(`[Auth] Invalid request from ${ip}:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
        },
        { status: 400 }
      );
    }

    // Increment rate limit before password check
    incrementRateLimit(ip);

    // Get password hash from env
    const env = getAuthEnv();
  
    // Verify password - use timing-safe comparison
    const isValid = await verifyPassword(
      result.data.password,
      env.SHH_PASSWORD_HASH
    );

    if (!isValid) {
      console.warn(`[Auth] Invalid password attempt from ${ip}`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid password",
        },
        { status: 401 }
      );
    }

    // Create and set session cookie
    const sessionData = await createSessionData();
    await createSessionCookie(sessionData);

    const duration = Date.now() - startTime;
    console.info(`[Auth] Successful login from ${ip} (${duration}ms)`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Auth] Error processing login from ${ip} (${duration}ms):`, error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred",
      },
      { status: 500 }
    );
  }
}
