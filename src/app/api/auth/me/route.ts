import { getSession } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { students, parents, staffProfiles, classSections, departments } from "@/db/schema";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonError("Not authenticated", 401);

    let profile: Record<string, unknown> = {};
    if (session.role === "STUDENT" && session.studentId) {
      const [s] = await db
        .select({
          id: students.id,
          admissionNumber: students.admissionNumber,
          fullName: students.fullName,
          dateOfBirth: students.dateOfBirth,
          gender: students.gender,
          phone: students.phone,
          address: students.address,
          photoUrl: students.photoUrl,
          enrollmentDate: students.enrollmentDate,
          classSectionId: students.classSectionId,
        })
        .from(students)
        .where(eq(students.id, session.studentId))
        .limit(1);
      if (s) {
        let classInfo: { id: number; name: string; semester: number; academicYear: string; departmentName: string; departmentCode: string } | null = null;
        if (s.classSectionId) {
          const [c] = await db
            .select({
              id: classSections.id,
              name: classSections.name,
              semester: classSections.semester,
              academicYear: classSections.academicYear,
              departmentName: departments.name,
              departmentCode: departments.code,
            })
            .from(classSections)
            .innerJoin(departments, eq(departments.id, classSections.departmentId))
            .where(eq(classSections.id, s.classSectionId))
            .limit(1);
          if (c) classInfo = c;
        }
        profile = { student: { ...s, class: classInfo } };
      }
    } else if (session.role === "PARENT" && session.parentId) {
      const [p] = await db
        .select()
        .from(parents)
        .where(eq(parents.id, session.parentId))
        .limit(1);
      if (p) profile = { parent: { id: p.id, fullName: p.fullName, phone: p.phone } };
    } else if (session.role === "STAFF" && session.staffId) {
      const [sp] = await db
        .select({
          id: staffProfiles.id,
          employeeId: staffProfiles.employeeId,
          designation: staffProfiles.designation,
          departmentName: departments.name,
        })
        .from(staffProfiles)
        .leftJoin(departments, eq(departments.id, staffProfiles.departmentId))
        .where(eq(staffProfiles.id, session.staffId))
        .limit(1);
      if (sp) profile = { staff: sp };
    }

    return jsonOk({
      userId: session.userId,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
      ...profile,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
