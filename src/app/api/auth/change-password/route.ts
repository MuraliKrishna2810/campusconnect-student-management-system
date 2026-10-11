import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return jsonError("Not authenticated", 401);
    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || !newPassword) {
      return jsonError("currentPassword and newPassword are required", 400);
    }
    if (newPassword.length < 6) {
      return jsonError("New password must be at least 6 characters", 400);
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return jsonError("User not found", 404);
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return jsonError("Current password is incorrect", 400);
    const hash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
    return jsonOk({ changed: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
