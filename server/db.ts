import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL;

if (!rawDbUrl) {
  console.error("DATABASE_URL is EMPTY / undefined");
  throw new Error("DATABASE_URL must be set.");
}

let hostname = "";
try {
  const u = new URL(rawDbUrl);
  hostname = u.hostname;
  console.log("[DB] DATABASE_URL hostname:", hostname);
} catch {
  console.log("[DB] DATABASE_URL is NOT a valid URL:", rawDbUrl);
}

const isRailwayInternal = hostname.endsWith(".railway.internal");

// IMPORTANT: public railway proxy usually needs SSL
const pool = new Pool({
  connectionString: rawDbUrl,
  ssl: isRailwayInternal ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export { pool };
