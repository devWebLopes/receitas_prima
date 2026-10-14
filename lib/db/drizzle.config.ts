import { defineConfig } from "drizzle-kit";
import { existsSync } from "fs";
import path from "path";

// Local development: load the root .env if it exists (Replit injects env vars directly).
const rootEnvFile = path.join(__dirname, "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // drizzle-kit resolves this via glob, which requires forward slashes (Windows uses `\`).
  schema: path.join(__dirname, "./src/schema/index.ts").replace(/\\/g, "/"),
  dialect: "postgresql",
  out: path.join(__dirname, "./drizzle").replace(/\\/g, "/"),
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
