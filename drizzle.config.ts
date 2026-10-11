import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.MYSQL_URL ?? "mysql://campusconnect:campusconnect@127.0.0.1:3306/campusconnect",
  },
});
