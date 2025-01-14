import { NextResponse } from "next/server";
import { clearSessionCookie } from "~/lib/auth/utils";
import { type AuthResponse } from "~/lib/auth/types";

export async function POST(): Promise<NextResponse<AuthResponse>> {
  const startTime = Date.now();
  
  try {
    await clearSessionCookie();
    
    const duration = Date.now() - startTime;
    console.info(`[Auth] Successful logout (${duration}ms)`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Auth] Error processing logout (${duration}ms):`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to logout" 
      },
      { status: 500 }
    );
  }
}
