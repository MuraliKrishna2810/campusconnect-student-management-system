import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classSections, departments } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const sp = new URL(req.url).searchParams;
    const departmentId = sp.get("departmentId");
    const items = await db
      .select({
        id: classSections.id,
        name: classSections.name,
        semester: classSections.semester,
        academicYear: classSections.academicYear,
        departmentId: departments.id,
        departmentName: departments.name,
      })
      .from(classSections)
      .innerJoin(departments, eq(departments.id, classSections.departmentId))
      .where(departmentId ? eq(classSections.departmentId, Number(departmentId)) : undefined);
    return jsonOk({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const semester = Number(body.semester);
    const departmentId = Number(body.departmentId);
    const academicYear = String(body.academicYear || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));
    if (!name || !semester || !departmentId) {
      return jsonError("name, semester, departmentId required", 400);
    }
    const [inserted] = await db
      .insert(classSections)
      .values({ name, semester, departmentId, academicYear })
      .$returningId();
    const [c] = await db
      .select()
      .from(classSections)
      .where(eq(classSections.id, inserted.id))
      .limit(1);
    return jsonOk(c, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
