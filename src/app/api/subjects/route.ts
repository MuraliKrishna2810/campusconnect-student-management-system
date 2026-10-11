import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    requireRole(await getSession(), ["STAFF", "PARENT", "STUDENT"]);
    const sp = new URL(req.url).searchParams;
    const classSectionId = sp.get("classSectionId");
    const items = await db
      .select()
      .from(subjects)
      .where(classSectionId ? eq(subjects.classSectionId, Number(classSectionId)) : undefined);
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
    const code = String(body.code || "").trim();
    const classSectionId = Number(body.classSectionId);
    if (!name || !code || !classSectionId) {
      return jsonError("name, code, classSectionId required", 400);
    }
    const [inserted] = await db
      .insert(subjects)
      .values({ name, code, classSectionId })
      .$returningId();
    const [s] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, inserted.id))
      .limit(1);
    return jsonOk(s, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
