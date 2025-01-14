import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

/**
 * INSTRUCTIONS:
 * Example of how to generate password hash
 * node scripts/generate-auth-env.js "your-secure-password-here"
 */

// Generate a secure random string for SESSION_SECRET
const sessionSecret = randomBytes(32).toString("hex");

const password = process.argv[2];
if (!password) {
  console.error("Please provide a password as an argument");
  process.exit(1);
}

// Generate password hash
bcrypt.hash(password, 10).then((hash) => {
  // For local .env file (escaped)
  const escapedHash = hash.replace(/\$/g, '\\$');
  console.log("\nFor local .env file:");
  console.log(`SHH_PASSWORD_HASH='${escapedHash}'`);
  console.log(`SHH_SESSION_SECRET="${sessionSecret}"`);
  
  // For Vercel environment variables (unescaped)
  console.log("\nFor Vercel environment variables:");
  console.log(`SHH_PASSWORD_HASH="${hash}"`);
  console.log(`SHH_SESSION_SECRET="${sessionSecret}"`);
});
