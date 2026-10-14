import { defineConfig } from "drizzle-kit";

const mysqlUrl = process.env.MYSQL_URL;

if (!mysqlUrl) {
  throw new Error("MYSQL_URL environment variable is not configured");
}

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: mysqlUrl,
  },
});