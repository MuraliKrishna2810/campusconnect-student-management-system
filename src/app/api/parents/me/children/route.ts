import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  parentStudent,
  students,
  users,
  classSections,
  departments,
} from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const session = requireRole(await getSession(), ["PARENT"]);
    if (!session.parentId) return jsonOk({ items: [] });
    const rows = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        admissionNumber: students.admissionNumber,
        email: users.email,
        photoUrl: students.photoUrl,
        className: classSections.name,
        semester: classSections.semester,
        departmentName: departments.name,
        relation: parentStudent.relation,
      })
      .from(parentStudent)
      .innerJoin(students, eq(students.id, parentStudent.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classSections, eq(classSections.id, students.classSectionId))
      .leftJoin(departments, eq(departments.id, classSections.departmentId))
      .where(eq(parentStudent.parentId, session.parentId));
    return jsonOk({ items: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}
