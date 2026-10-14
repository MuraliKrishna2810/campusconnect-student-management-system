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
      "Database is not configured. Set MYSQL_URL in .env and start MySQL before logging in."
    );
  }

  try {
    await pool.execute("SELECT 1");
  } catch {
    throw new Error(
      "MySQL is unavailable. Start the database service and retry."
    );
  }
}
