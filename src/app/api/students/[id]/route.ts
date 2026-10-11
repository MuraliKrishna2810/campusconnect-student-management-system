import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  students,
  classSections,
  departments,
  parents,
  parentStudent,
} from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const { id } = await params;
    const studentId = Number(id);
    if (!Number.isFinite(studentId)) return jsonError("Invalid id", 400);

    // Students can only view themselves
    if (session.role === "STUDENT" && session.studentId !== studentId) {
      return jsonError("Forbidden", 403);
    }
    // Parents must be linked
    if (session.role === "PARENT" && session.parentId) {
      const link = await db
        .select()
        .from(parentStudent)
        .where(
          and(
            eq(parentStudent.parentId, session.parentId),
            eq(parentStudent.studentId, studentId)
          )
        )
        .limit(1);
      if (!link.length) return jsonError("Forbidden", 403);
    }

    const [row] = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        fullName: students.fullName,
        email: users.email,
        gender: students.gender,
        phone: students.phone,
        address: students.address,
        photoUrl: students.photoUrl,
        dateOfBirth: students.dateOfBirth,
        enrollmentDate: students.enrollmentDate,
        active: students.active,
        classSectionId: students.classSectionId,
        className: classSections.name,
        semester: classSections.semester,
        academicYear: classSections.academicYear,
        departmentId: departments.id,
        departmentName: departments.name,
        departmentCode: departments.code,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classSections, eq(classSections.id, students.classSectionId))
      .leftJoin(departments, eq(departments.id, classSections.departmentId))
      .where(eq(students.id, studentId))
      .limit(1);
    if (!row) return jsonError("Student not found", 404);

    // Linked parents
    const linkedParents = await db
      .select({
        id: parents.id,
        fullName: parents.fullName,
        email: users.email,
        relation: parentStudent.relation,
      })
      .from(parentStudent)
      .innerJoin(parents, eq(parents.id, parentStudent.parentId))
      .innerJoin(users, eq(users.id, parents.userId))
      .where(eq(parentStudent.studentId, studentId));

    return jsonOk({ ...row, linkedParents });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireRole(session, ["STAFF"]);
    const { id } = await params;
    const studentId = Number(id);
    const body = await req.json().catch(() => ({}));
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!existing) return jsonError("Student not found", 404);

    const updates: Partial<typeof existing> = {};
    for (const k of [
      "fullName",
      "gender",
      "phone",
      "address",
      "dateOfBirth",
      "photoUrl",
    ] as const) {
      if (k in body) (updates as Record<string, unknown>)[k] = body[k] ?? null;
    }
    if ("classSectionId" in body) {
      updates.classSectionId = body.classSectionId ? Number(body.classSectionId) : null;
    }
    if ("active" in body) {
      updates.active = Boolean(body.active);
    }
    if (Object.keys(updates).length) {
      await db.update(students).set(updates).where(eq(students.id, studentId));
    }
    if (body.email) {
      await db
        .update(users)
        .set({ email: String(body.email).toLowerCase(), displayName: body.fullName ?? existing.fullName })
        .where(eq(users.id, existing.userId));
    }
    return jsonOk({ updated: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requireRole(session, ["STAFF"]);
    const { id } = await params;
    const studentId = Number(id);
    await db
      .update(students)
      .set({ active: false })
      .where(eq(students.id, studentId));
    return jsonOk({ deactivated: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
