import { NextRequest } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceSessions,
  attendanceRecords,
  classSections,
  subjects,
  students,
  users,
} from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { evaluateAndNotifyAttendance } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requireRole(session, ["STAFF"]);
    const sp = new URL(req.url).searchParams;
    const classSectionId = sp.get("classSectionId");
    const subjectId = sp.get("subjectId");

    const sessions = await db
      .select({
        id: attendanceSessions.id,
        sessionDate: attendanceSessions.sessionDate,
        cancelled: attendanceSessions.cancelled,
        notes: attendanceSessions.notes,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        classSectionId: classSections.id,
        className: classSections.name,
        semester: classSections.semester,
        createdAt: attendanceSessions.createdAt,
      })
      .from(attendanceSessions)
      .innerJoin(subjects, eq(subjects.id, attendanceSessions.subjectId))
      .innerJoin(classSections, eq(classSections.id, attendanceSessions.classSectionId))
      .where(
        and(
          classSectionId
            ? eq(attendanceSessions.classSectionId, Number(classSectionId))
            : undefined,
          subjectId ? eq(attendanceSessions.subjectId, Number(subjectId)) : undefined
        )
      )
      .orderBy(desc(attendanceSessions.sessionDate))
      .limit(200);

    return jsonOk({ items: sessions });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const classSectionId = Number(body.classSectionId);
    const subjectId = Number(body.subjectId);
    const sessionDate = String(body.sessionDate || new Date().toISOString().slice(0, 10));
    const notes = body.notes ? String(body.notes) : null;

    if (!classSectionId || !subjectId) {
      return jsonError("classSectionId and subjectId are required", 400);
    }

    // Verify subject belongs class
    const [subj] = await db
      .select()
      .from(subjects)
      .where(
        and(eq(subjects.id, subjectId), eq(subjects.classSectionId, classSectionId))
      )
      .limit(1);
    if (!subj) return jsonError("Subject not in this class", 400);

    return await db.transaction(async (tx) => {
      // Unique per (class, subject, date) — prevent duplicates
      const [existing] = await tx
        .select()
        .from(attendanceSessions)
        .where(
          and(
            eq(attendanceSessions.classSectionId, classSectionId),
            eq(attendanceSessions.subjectId, subjectId),
            eq(attendanceSessions.sessionDate, sessionDate)
          )
        )
        .limit(1);
      if (existing) {
        return jsonError(
          "A session already exists for this class/subject/date. Use the session's records endpoint to edit.",
          409,
          { existingSessionId: existing.id }
        );
      }

      const [insertedSession] = await tx
        .insert(attendanceSessions)
        .values({
          classSectionId,
          subjectId,
          sessionDate,
          notes,
          createdByStaffId: session.staffId!,
        })
        .$returningId();
      const sessionId = insertedSession.id;

      // Default mark PRESENT for all active students in this class
      const classStudents = await tx
        .select({ id: students.id })
        .from(students)
        .where(
          and(
            eq(students.classSectionId, classSectionId),
            eq(students.active, true)
          )
        );
      if (classStudents.length) {
        await tx.insert(attendanceRecords).values(
          classStudents.map((s) => ({
            sessionId,
            studentId: s.id,
            status: "PRESENT" as const,
            recordedByStaffId: session.staffId!,
          }))
        );
      }
      return jsonOk({ id: sessionId, sessionDate, studentCount: classStudents.length }, 201);
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
