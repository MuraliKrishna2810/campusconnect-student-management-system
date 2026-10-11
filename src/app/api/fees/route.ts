import { NextRequest } from "next/server";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { feeObligations, feePayments, students } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const sp = new URL(req.url).searchParams;
    const studentId = sp.get("studentId");
    const overdue = sp.get("overdue") === "true";
    const today = new Date().toISOString().slice(0, 10);

    const conditions = [];
    if (studentId) conditions.push(eq(feeObligations.studentId, Number(studentId)));
    if (overdue) conditions.push(sql`${feeObligations.dueDate} < ${today}`);
    const where = conditions.length ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: feeObligations.id,
        studentId: feeObligations.studentId,
        studentName: students.fullName,
        feeType: feeObligations.feeType,
        amount: feeObligations.amount,
        dueDate: feeObligations.dueDate,
        academicPeriod: feeObligations.academicPeriod,
        description: feeObligations.description,
      })
      .from(feeObligations)
      .innerJoin(students, eq(students.id, feeObligations.studentId))
      .where(where)
      .orderBy(desc(feeObligations.dueDate));

    return jsonOk({
      items: items.map((item) => ({ ...item, amount: Number(item.amount) })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const body = await req.json().catch(() => ({}));
    const studentId = Number(body.studentId);
    const feeType = String(body.feeType || "").trim();
    const amount = Number(body.amount);
    const dueDate = String(body.dueDate);
    const academicPeriod = String(body.academicPeriod || "").trim();
    const description = body.description ? String(body.description) : null;

    if (
      !studentId ||
      !feeType ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !dueDate ||
      !academicPeriod
    ) {
      return jsonError("studentId, feeType, amount>0, dueDate, academicPeriod required", 400);
    }

    const [inserted] = await db
      .insert(feeObligations)
      .values({
        studentId,
        feeType,
        amount: String(amount),
        dueDate,
        academicPeriod,
        description,
      })
      .$returningId();
    const [fee] = await db
      .select()
      .from(feeObligations)
      .where(eq(feeObligations.id, inserted.id))
      .limit(1);
    return jsonOk({ ...fee, amount: Number(fee.amount) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
