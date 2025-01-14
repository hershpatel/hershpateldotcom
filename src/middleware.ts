import { NextResponse, type NextRequest } from "next/server";
import { getSessionData } from "~/lib/auth/utils";

// Paths that require authentication
const PROTECTED_PATHS = ["/shh"];

// Security headers
const securityHeaders = {
  // Prevent browsers from performing MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Prevent embedding in iframes
  "X-Frame-Options": "DENY",
  // Enable browser XSS filtering
  "X-XSS-Protection": "1; mode=block",
  // Disable client-side caching for authenticated routes
  "Cache-Control": "no-store, max-age=0",
  // CSP to prevent XSS and other injections
  "Content-Security-Policy": `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: ${process.env.CLOUDFRONT_URL ?? ''};
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s+/g, " ").trim(),
  // Strict transport security
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Permissions policy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // Helper function to add security headers
  const addSecurityHeaders = (res: NextResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    return res;
  };

  // Helper function to create redirect response
  const createRedirect = (url: URL) => {
    return addSecurityHeaders(NextResponse.redirect(url));
  };

  // Get session status
  const session = await getSessionData(request);

  // Handle login page access
  if (pathname === "/shh/login") {
    if (session) {
      // Redirect authenticated users away from login
      const returnTo = request.nextUrl.searchParams.get("from") ?? "/shh";
      return createRedirect(new URL(returnTo, request.url));
    }
    return addSecurityHeaders(response);
  }

  // Handle protected paths
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    if (!session) {
      // Redirect unauthenticated users to login
      const url = new URL("/shh/login", request.url);
      url.searchParams.set("from", pathname);
      return createRedirect(url);
    }
  }

  // Add security headers to all /shh routes and return
  return addSecurityHeaders(response);
}

// Configure middleware to run only on /shh paths
export const config = {
  matcher: [
    '/shh',           // Match exact /shh
    '/shh/:path*',    // Match /shh/anything
    '/shh/(.*)',      // Alternative syntax for root path
  ]
};
