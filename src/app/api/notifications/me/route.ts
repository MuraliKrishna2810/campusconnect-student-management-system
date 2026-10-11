import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const session = requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return jsonOk({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
