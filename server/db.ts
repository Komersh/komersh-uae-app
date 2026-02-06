import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL;

if (!rawDbUrl) {
  console.error("DATABASE_URL is EMPTY / undefined");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Print safe connection diagnostics (no password)
try {
  const u = new URL(rawDbUrl);
  console.log("[DB] DATABASE_URL hostname:", u.hostname);
  console.log("[DB] DATABASE_URL port:", u.port || "(default)");
  console.log("[DB] DATABASE_URL db:", u.pathname);
} catch {
  console.log("[DB] DATABASE_URL is NOT a valid URL, value:", rawDbUrl);
}

// Also check potential PG* overrides that can break DNS
console.log("[DB] PGHOST:", process.env.PGHOST);
console.log("[DB] PGDATABASE:", process.env.PGDATABASE);
console.log("[DB] PGPORT:", process.env.PGPORT);
console.log("[DB] PGUSER:", process.env.PGUSER);

// Create pool
export const pool = new Pool({ connectionString: rawDbUrl });
export const db = drizzle(pool, { schema });
