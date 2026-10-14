import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = (process.env.MYSQL_URL || "").trim();
const hasConfiguredDatabaseUrl =
  Boolean(databaseUrl) &&
  !databaseUrl.includes("******") &&
  !databaseUrl.includes("replace-with") &&
  !databaseUrl.includes("example");

const fallbackPool = createPool("mysql://localhost:3306/campusconnect");

const globalForDb = globalThis as typeof globalThis & {
  __campusConnectMySqlPool?: ReturnType<typeof createPool>;
};

export const isDatabaseConfigured = hasConfiguredDatabaseUrl;

export const pool =
  hasConfiguredDatabaseUrl
    ? globalForDb.__campusConnectMySqlPool ?? createPool(databaseUrl)
    : null;

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__campusConnectMySqlPool = pool;
}

export const db = drizzle({
  client: pool ?? fallbackPool,
  mode: "default",
  schema,
});

export async function assertDatabaseAvailable(): Promise<void> {
  if (!pool) {
    throw new Error(
      "Database is not configured. Set MYSQL_URL to a reachable MySQL database in the app's environment. On Vercel, add it in Project Settings > Environment Variables."
    );
  }

  try {
    await pool.execute("SELECT 1");
  } catch (error) {
    console.error("[database] MySQL health check failed:", error);
    throw new Error(
      "MySQL is unreachable. Start your local MySQL service, or configure MYSQL_URL with a reachable hosted database. Do not use localhost for a Vercel deployment."
    );
  }
}
