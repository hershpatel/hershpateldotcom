import { NextResponse, type NextRequest } from "next/server";
import { getSessionData } from "~/lib/auth/utils";

// Paths that require authentication
const PROTECTED_PATHS = ["/shh"];
// Paths that should be accessible without auth
const PUBLIC_PATHS = ["/shh/login"];

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

  // Start with a new response
  let response = NextResponse.next();

  // Check if this is a protected path
  const isProtectedPath = PROTECTED_PATHS.some((path) => 
    pathname.startsWith(path)
  );

  // Allow public paths
  const isPublicPath = PUBLIC_PATHS.some((path) => 
    pathname === path
  );

  // Add security headers to all /shh routes
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // If not a protected path or is explicitly public, return with headers
  if (!isProtectedPath || isPublicPath) {
    return response;
  }

  // Validate session
  const session = await getSessionData(request);

  if (!session) {
    // Redirect to login with return URL
    const url = new URL("/shh/login", request.url);
    url.searchParams.set("from", pathname);
    response = NextResponse.redirect(url);
    
    // Add security headers to redirect
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // Session is valid, return with headers
  return response;
}

// Configure middleware to run only on /shh paths
export const config = {
  matcher: [
    '/shh',           // Match exact /shh
    '/shh/:path*',    // Match /shh/anything
    '/shh/(.*)',      // Alternative syntax for root path
  ]
};
