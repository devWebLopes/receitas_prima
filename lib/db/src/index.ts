import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvFile = path.resolve(__dirname, "../../../.env");
if (existsSync(rootEnvFile) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvFile);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Serverless (Vercel): poucas conexões por instância; use a URL "pooled" do Neon
// com `sslmode=require`.
const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 3 : 10,
  idleTimeoutMillis: isProduction ? 10_000 : 30_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
