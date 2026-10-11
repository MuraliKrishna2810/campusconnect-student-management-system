import { db } from "@/db";
import { jsonOk, handleRouteError } from "@/lib/api";
import { getSession, requireRole } from "@/lib/session";

export async function GET() {
  try {
    requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const { departments } = await import("@/db/schema");
    const items = await db.select().from(departments);
    return jsonOk({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
