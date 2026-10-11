import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, assessments } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const sp = new URL(req.url).searchParams;
    const subjectId = sp.get("subjectId");
    const classSectionId = sp.get("classSectionId");

    const items = await db
      .select()
      .from(assessments)
      .innerJoin(subjects, eq(subjects.id, assessments.subjectId))
      .where(
        and(
          subjectId ? eq(assessments.subjectId, Number(subjectId)) : undefined,
          classSectionId ? eq(subjects.classSectionId, Number(classSectionId)) : undefined
        )
      );

    const shaped = items.map((a) => ({
      id: a.assessments.id,
      subjectId: a.subjects.id,
      subjectName: a.subjects.name,
      subjectCode: a.subjects.code,
      name: a.assessments.name,
      type: a.assessments.type,
      maxMarks: Number(a.assessments.maxMarks),
      examDate: a.assessments.examDate,
      published: a.assessments.published,
    }));

    // Non-staff can only see published
    if (session.role !== "STAFF") {
      return jsonOk({ items: shaped.filter((a) => a.published) });
    }
    return jsonOk({ items: shaped });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const subjectId = Number(body.subjectId);
    const name = String(body.name || "").trim();
    const type = body.type || "INTERNAL";
    const maxMarks = Number(body.maxMarks);
    const examDate = body.examDate ? String(body.examDate) : null;
    const published = body.published !== false;

    if (!subjectId || !name || !Number.isFinite(maxMarks) || maxMarks <= 0) {
      return jsonError("subjectId, name, and positive maxMarks required", 400);
    }
    const [subj] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);
    if (!subj) return jsonError("Subject not found", 404);

    const [inserted] = await db
      .insert(assessments)
      .values({ subjectId, name, type, maxMarks: String(maxMarks), examDate, published })
      .$returningId();
    const [a] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, inserted.id))
      .limit(1);
    return jsonOk(a, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
