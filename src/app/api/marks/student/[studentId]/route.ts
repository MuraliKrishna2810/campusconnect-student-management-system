import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marks, assessments, subjects, students } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const { studentId } = await params;
    const id = Number(studentId);
    if (session.role === "STUDENT" && session.studentId !== id) {
      return jsonError("Forbidden", 403);
    }
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    if (!student) return jsonError("Student not found", 404);

    const rows = await db
      .select({
        id: marks.id,
        obtainedMarks: marks.obtainedMarks,
        recordedAt: marks.recordedAt,
        assessmentId: assessments.id,
        assessmentName: assessments.name,
        type: assessments.type,
        maxMarks: assessments.maxMarks,
        examDate: assessments.examDate,
        published: assessments.published,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(marks)
      .innerJoin(assessments, eq(assessments.id, marks.assessmentId))
      .innerJoin(subjects, eq(subjects.id, assessments.subjectId))
      .where(eq(marks.studentId, id));

    // Non-staff only see published assessments
    const visible =
      session.role === "STAFF" ? rows : rows.filter((r) => r.published);

    const shaped = visible.map((r) => ({
      ...r,
      obtainedMarks: Number(r.obtainedMarks),
      maxMarks: Number(r.maxMarks),
      percentage:
        Number(r.maxMarks) > 0
          ? Number(((Number(r.obtainedMarks) / Number(r.maxMarks)) * 100).toFixed(2))
          : 0,
    }));

    // Subject-wise aggregate
    const bySubject = new Map<
      number,
      {
        subjectId: number;
        subjectName: string;
        subjectCode: string;
        totalMax: number;
        totalObtained: number;
        assessments: number;
      }
    >();
    for (const r of shaped) {
      const key = r.subjectId;
      const cur = bySubject.get(key) || {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        totalMax: 0,
        totalObtained: 0,
        assessments: 0,
      };
      cur.totalMax += r.maxMarks;
      cur.totalObtained += r.obtainedMarks;
      cur.assessments += 1;
      bySubject.set(key, cur);
    }

    return jsonOk({
      marks: shaped,
      summary: Array.from(bySubject.values()).map((s) => ({
        ...s,
        percentage: s.totalMax > 0 ? Number(((s.totalObtained / s.totalMax) * 100).toFixed(2)) : 0,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
