import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";
import { computeStudentAttendance } from "@/lib/attendance";

export async function GET() {
  try {
    const session = requireRole(await getSession(), ["STUDENT"]);
    if (!session.studentId) return jsonError("Student profile missing", 404);
    const summary = await computeStudentAttendance(session.studentId);
    return jsonOk({ studentId: session.studentId, ...summary });
  } catch (err) {
    return handleRouteError(err);
  }
}
