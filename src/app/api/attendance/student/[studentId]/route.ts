import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { computeStudentAttendance } from "@/lib/attendance";

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

    const summary = await computeStudentAttendance(id);
    return jsonOk({ studentId: id, ...summary });
  } catch (err) {
    return handleRouteError(err);
  }
}
