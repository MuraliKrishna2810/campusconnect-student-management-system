import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceSessions,
  attendanceRecords,
  students,
  users,
  subjects,
  classSections,
} from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { evaluateAndNotifyAttendance } from "@/lib/attendance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const { id } = await params;
    const sessionId = Number(id);
    const [s] = await db
      .select({
        id: attendanceSessions.id,
        sessionDate: attendanceSessions.sessionDate,
        cancelled: attendanceSessions.cancelled,
        notes: attendanceSessions.notes,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        className: classSections.name,
        semester: classSections.semester,
      })
      .from(attendanceSessions)
      .innerJoin(subjects, eq(subjects.id, attendanceSessions.subjectId))
      .innerJoin(classSections, eq(classSections.id, attendanceSessions.classSectionId))
      .where(eq(attendanceSessions.id, sessionId))
      .limit(1);
    if (!s) return jsonError("Session not found", 404);

    const records = await db
      .select({
        id: attendanceRecords.id,
        studentId: students.id,
        fullName: students.fullName,
        admissionNumber: students.admissionNumber,
        email: users.email,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(students, eq(students.id, attendanceRecords.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(attendanceRecords.sessionId, sessionId));

    return jsonOk({ session: s, records });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * POST { records: [{ studentId, status }] }
 * Upserts attendance for each record (prevents duplicates via unique index).
 * After saving, runs notification evaluation per affected student.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const { id } = await params;
    const sessionId = Number(id);
    const body = await req.json().catch(() => ({}));
    const records = Array.isArray(body.records) ? body.records : [];
    const cancelled = typeof body.cancelled === "boolean" ? body.cancelled : undefined;

    const [s] = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, sessionId))
      .limit(1);
    if (!s) return jsonError("Session not found", 404);

    return await db.transaction(async (tx) => {
      if (typeof cancelled === "boolean") {
        await tx
          .update(attendanceSessions)
          .set({ cancelled })
          .where(eq(attendanceSessions.id, sessionId));
      }

      const affectedStudentIds = new Set<number>();
      for (const r of records) {
        const studentId = Number(r.studentId);
        const status = r.status;
        if (!["PRESENT", "ABSENT", "EXCUSED"].includes(status)) continue;
        if (!Number.isFinite(studentId)) continue;

        const [existing] = await tx
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.sessionId, sessionId),
              eq(attendanceRecords.studentId, studentId)
            )
          )
          .limit(1);
        if (existing) {
          await tx
            .update(attendanceRecords)
            .set({ status, recordedByStaffId: session.staffId!, updatedAt: new Date() })
            .where(eq(attendanceRecords.id, existing.id));
        } else {
          await tx.insert(attendanceRecords).values({
            sessionId,
            studentId,
            status,
            recordedByStaffId: session.staffId!,
          });
        }
        affectedStudentIds.add(studentId);
      }

      return { affectedStudentIds: Array.from(affectedStudentIds) };
    }).then(async (result) => {
      // Run notification evaluation outside the transaction (post-commit)
      let totalEmails = 0;
      let totalDuplicates = 0;
      const perStudent: Record<number, { emails: number; duplicates: number }> = {};
      for (const studentId of result.affectedStudentIds) {
        const r = await evaluateAndNotifyAttendance(studentId);
        perStudent[studentId] = r;
        totalEmails += r.emails;
        totalDuplicates += r.duplicates;
      }
      return jsonOk({
        updated: result.affectedStudentIds.length,
        notificationSummary: { emails: totalEmails, duplicates: totalDuplicates, perStudent },
      });
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
