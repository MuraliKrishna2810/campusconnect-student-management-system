import { getSession, requireRole } from "@/lib/session";
import { jsonError, handleRouteError } from "@/lib/api";
import { GET as getStudentMarks } from "@/app/api/marks/student/[studentId]/route";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STUDENT"]);
    if (!session.studentId) return jsonError("Student profile missing", 404);
    return getStudentMarks(req, { params: Promise.resolve({ studentId: String(session.studentId) }) });
  } catch (err) {
    return handleRouteError(err);
  }
}
