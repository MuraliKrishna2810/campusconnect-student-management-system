import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { marks, assessments } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const assessmentId = Number(body.assessmentId);
    const studentId = Number(body.studentId);
    const obtainedMarks = Number(body.obtainedMarks);

    if (!assessmentId || !studentId || !Number.isFinite(obtainedMarks)) {
      return jsonError("assessmentId, studentId, obtainedMarks required", 400);
    }
    if (obtainedMarks < 0) return jsonError("Marks cannot be negative", 400);

    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, assessmentId))
      .limit(1);
    if (!assessment) return jsonError("Assessment not found", 404);
    if (obtainedMarks > Number(assessment.maxMarks)) {
      return jsonError(`Marks cannot exceed max (${assessment.maxMarks})`, 400);
    }

    // Upsert (unique index per assessment/student)
    const [existing] = await db
      .select()
      .from(marks)
      .where(
        and(eq(marks.assessmentId, assessmentId), eq(marks.studentId, studentId))
      )
      .limit(1);
    if (existing) {
      await db
        .update(marks)
        .set({
          obtainedMarks: String(obtainedMarks),
          recordedByStaffId: session.staffId!,
          recordedAt: new Date(),
        })
        .where(eq(marks.id, existing.id));
      return jsonOk({ id: existing.id, updated: true });
    }
    const [inserted] = await db
      .insert(marks)
      .values({
        assessmentId,
        studentId,
        obtainedMarks: String(obtainedMarks),
        recordedByStaffId: session.staffId!,
      })
      .$returningId();
    const [m] = await db
      .select()
      .from(marks)
      .where(eq(marks.id, inserted.id))
      .limit(1);
    return jsonOk(m, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
