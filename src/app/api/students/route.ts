import { NextRequest } from "next/server";
import { eq, like, and, or, sql, desc } from "drizzle-orm";
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
import { hashPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return jsonError("Not authenticated", 401);
    // Staff sees all; parents see linked; students cannot list
    requireRole(session, ["STAFF", "PARENT"]);

    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim() || "";
    const classSectionId = sp.get("classSectionId");
    const departmentId = sp.get("departmentId");
    const semester = sp.get("semester");
    const active = sp.get("active");
    const page = Math.max(1, Number(sp.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || "25")));

    const conditions = [];
    if (active === null || active === undefined || active === "") {
      conditions.push(eq(students.active, true));
    } else if (active === "all") {
      // no filter
    } else {
      conditions.push(eq(students.active, active === "true"));
    }
    if (classSectionId) conditions.push(eq(students.classSectionId, Number(classSectionId)));
    if (semester) conditions.push(eq(classSections.semester, Number(semester)));
    if (departmentId) conditions.push(eq(classSections.departmentId, Number(departmentId)));
    if (q) {
      conditions.push(
        or(
          like(students.fullName, `%${q}%`),
          like(students.admissionNumber, `%${q}%`),
          like(users.email, `%${q}%`)
        )!
      );
    }

    // For parents: restrict to linked children
    let parentChildIds: number[] | null = null;
    if (session.role === "PARENT" && session.parentId) {
      const links = await db
        .select({ studentId: parentStudent.studentId })
        .from(parentStudent)
        .where(eq(parentStudent.parentId, session.parentId));
      parentChildIds = links.map((l) => l.studentId);
      if (parentChildIds.length === 0) {
        return jsonOk({ items: [], total: 0, page, pageSize });
      }
      conditions.push(sql`${students.id} IN (${sql.join(parentChildIds.map((id) => sql`${id}`), sql`, `)})`);
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .innerJoin(classSections, eq(classSections.id, students.classSectionId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(where);
    const total = totalRes[0]?.count ?? 0;

    const items = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        fullName: students.fullName,
        email: users.email,
        gender: students.gender,
        phone: students.phone,
        enrollmentDate: students.enrollmentDate,
        active: students.active,
        photoUrl: students.photoUrl,
        classSectionId: students.classSectionId,
        className: classSections.name,
        semester: classSections.semester,
        academicYear: classSections.academicYear,
        departmentName: departments.name,
        departmentCode: departments.code,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classSections, eq(classSections.id, students.classSectionId))
      .leftJoin(departments, eq(departments.id, classSections.departmentId))
      .where(where)
      .orderBy(desc(students.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return jsonOk({ items, total, page, pageSize });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requireRole(session, ["STAFF"]);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const admissionNumber = String(body.admissionNumber || "").trim();
    const password = String(body.password || "student123");
    const classSectionId = body.classSectionId ? Number(body.classSectionId) : null;
    const enrollmentDate = String(body.enrollmentDate || new Date().toISOString().slice(0, 10));
    const gender = body.gender ? String(body.gender) : null;
    const phone = body.phone ? String(body.phone) : null;
    const address = body.address ? String(body.address) : null;
    const dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth) : null;
    const parentEmail = body.parentEmail ? String(body.parentEmail).trim().toLowerCase() : null;

    if (!email || !fullName || !admissionNumber) {
      return jsonError("email, fullName, and admissionNumber are required", 400);
    }

    return await db.transaction(async (tx) => {
      // Check uniqueness
      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser.length) return jsonError("Email already registered", 400);
      const existingStudent = await tx
        .select({ id: students.id })
        .from(students)
        .where(eq(students.admissionNumber, admissionNumber))
        .limit(1);
      if (existingStudent.length) return jsonError("Admission number already registered", 400);

      const passwordHash = await hashPassword(password);
      const [insertedUser] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: "STUDENT",
          displayName: fullName,
        })
        .$returningId();

      const [insertedStudent] = await tx
        .insert(students)
        .values({
          userId: insertedUser.id,
          admissionNumber,
          fullName,
          gender,
          phone,
          address,
          dateOfBirth,
          enrollmentDate,
          classSectionId,
        })
        .$returningId();

      // Link parent if provided and exists
      if (parentEmail) {
        const [parentUser] = await tx
          .select()
          .from(users)
          .where(and(eq(users.email, parentEmail), eq(users.role, "PARENT")))
          .limit(1);
        if (parentUser) {
          const [parent] = await tx
            .select()
            .from(parents)
            .where(eq(parents.userId, parentUser.id))
            .limit(1);
          if (parent) {
            await tx.insert(parentStudent).values({
              parentId: parent.id,
              studentId: insertedStudent.id,
            });
          }
        }
      }

      return jsonOk(
        {
          id: insertedStudent.id,
          userId: insertedUser.id,
          admissionNumber,
          fullName,
          email,
        },
        201
      );
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
