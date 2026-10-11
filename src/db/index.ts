import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "./schema";

const databaseUrl = process.env.MYSQL_URL;

if (!databaseUrl) {
  throw new Error("MYSQL_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __campusConnectMySqlPool?: ReturnType<typeof createPool>;
};

export const pool =
  globalForDb.__campusConnectMySqlPool ?? createPool(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__campusConnectMySqlPool = pool;
}

export const db = drizzle({ client: pool, mode: "default", schema });
