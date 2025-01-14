import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

async function generateProdEnv() {
  // Generate session secret
  const sessionSecret = randomBytes(32).toString("hex");

  // Example password hash (you'll need to replace this with your actual password)
  const tempPassword = randomBytes(16).toString("hex"); // Random temporary password
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Create env content
  const envContent = `# Auth Configuration
SHH_PASSWORD_HASH="${passwordHash}"
SHH_SESSION_SECRET="${sessionSecret}"
SHH_SESSION_DURATION=86400

# Generated temporary password (remove after setting up): ${tempPassword}
# Please change this password immediately after deployment
`;

  // Write to file
  writeFileSync(".env.production", envContent);
  
  console.log("\nProduction environment variables generated!");
  console.log("----------------------------------------");
  console.log("1. Variables written to .env.production");
  console.log("2. Temporary password:", tempPassword);
  console.log("3. Add these variables to your Vercel project");
  console.log("4. Change the password after deployment");
  console.log("----------------------------------------\n");
}

// Run the script
void generateProdEnv(); 