import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { parentStudent, students, users, classSections, departments } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { computeStudentAttendance } from "@/lib/attendance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["PARENT"]);
    const { studentId } = await params;
    const id = Number(studentId);
    if (!session.parentId) return jsonError("Parent profile missing", 404);

    const link = await db
      .select()
      .from(parentStudent)
      .where(
        and(
          eq(parentStudent.parentId, session.parentId),
          eq(parentStudent.studentId, id)
        )
      )
      .limit(1);
    if (!link.length) return jsonError("Forbidden", 403);

    const [student] = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        admissionNumber: students.admissionNumber,
        email: users.email,
        photoUrl: students.photoUrl,
        className: classSections.name,
        semester: classSections.semester,
        departmentName: departments.name,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classSections, eq(classSections.id, students.classSectionId))
      .leftJoin(departments, eq(departments.id, classSections.departmentId))
      .where(eq(students.id, id))
      .limit(1);
    if (!student) return jsonError("Student not found", 404);

    const attendance = await computeStudentAttendance(id);
    return jsonOk({ student, attendance });
  } catch (err) {
    return handleRouteError(err);
  }
}
