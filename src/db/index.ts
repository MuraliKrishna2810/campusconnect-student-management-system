
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = (process.env.MYSQL_URL || "").trim();

const hasConfiguredDatabaseUrl =
  databaseUrl.startsWith("mysql://") &&
  !databaseUrl.includes("******") &&
  !databaseUrl.includes("replace-with") &&
  !databaseUrl.includes("example");

const globalForDb = globalThis as typeof globalThis & {
  __campusConnectMySqlPool?: ReturnType<typeof createPool>;
};

export const isDatabaseConfigured = hasConfiguredDatabaseUrl;

export const pool = hasConfiguredDatabaseUrl
  ? globalForDb.__campusConnectMySqlPool ?? createPool(databaseUrl)
  : null;

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__campusConnectMySqlPool = pool;
}

// Do not create a localhost fallback pool in production.
const fallbackPool = createPool(
  "mysql://campusconnect:campusconnect@127.0.0.1:3306/campusconnect"
);

export const db = drizzle({
  client: pool ?? fallbackPool,
  mode: "default",
  schema,
});
export async function assertDatabaseAvailable(): Promise<void> {
  if (!pool) {
    throw new Error(
      "Database is not configured. Set MYSQL_URL to a valid hosted MySQL connection URL."
    );
  }

  try {
    await pool.execute("SELECT 1");
  } catch (error) {
    console.error("[database] MySQL health check failed:", error);
    throw new Error("MySQL is unreachable. Check MYSQL_URL and database access.");
  }
}
