import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Lazily initialize so `next build` doesn't crash in environments
// where DATABASE_URL is only available at runtime (e.g., Vercel).

type GlobalDb = { __pg?: postgres.Sql; __drizzle?: ReturnType<typeof drizzle> };
const globalForDb = globalThis as unknown as GlobalDb;

export function getDb() {
  if (globalForDb.__drizzle) return globalForDb.__drizzle;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const sql =
    globalForDb.__pg ??
    postgres(url, {
      ssl: "require",
      max: 10,
      idle_timeout: 20,
    });

  if (process.env.NODE_ENV !== "production") globalForDb.__pg = sql;

  const db = drizzle(sql);
  globalForDb.__drizzle = db;
  return db;
}
