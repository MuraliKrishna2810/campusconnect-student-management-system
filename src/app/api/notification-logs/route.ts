import { getSession, requireRole } from "@/lib/session";
import { jsonOk, handleRouteError } from "@/lib/api";
import { db } from "@/db";
import { desc } from "drizzle-orm";
import { notificationLogs } from "@/db/schema";

export async function GET() {
  try {
    requireRole(await getSession(), ["STAFF"]);
    const items = await db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.sentAt))
      .limit(200);
    return jsonOk({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
