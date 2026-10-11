import { NextRequest } from "next/server";
import { eq, desc, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements, students } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    let classSectionId: number | null = null;
    if (session.role === "STUDENT" && session.studentId) {
      const [s] = await db
        .select({ classSectionId: students.classSectionId })
        .from(students)
        .where(eq(students.id, session.studentId))
        .limit(1);
      classSectionId = s?.classSectionId ?? null;
    }

    const items = await db
      .select()
      .from(announcements)
      .where(
        session.role === "STAFF"
          ? undefined
          : or(
              eq(announcements.audience, "ALL"),
              classSectionId ? eq(announcements.classSectionId, classSectionId) : undefined
            )
      )
      .orderBy(desc(announcements.createdAt))
      .limit(100);
    return jsonOk({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const bodyText = String(body.body || "").trim();
    const audience = body.audience || "ALL";
    const classSectionId = body.classSectionId ? Number(body.classSectionId) : null;
    if (!title || !bodyText) return jsonError("title and body required", 400);
    const [inserted] = await db
      .insert(announcements)
      .values({
        title,
        body: bodyText,
        audience,
        classSectionId,
        publishedByStaffId: session.staffId!,
      })
      .$returningId();
    const [a] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, inserted.id))
      .limit(1);
    return jsonOk(a, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
