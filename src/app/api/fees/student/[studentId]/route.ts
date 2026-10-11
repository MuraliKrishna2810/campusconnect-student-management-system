import { NextRequest } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { feeObligations, feePayments, students } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

/**
 * Returns all fee obligations + payments + computed pending balance for a student.
 * Pending Balance = sum of obligations − sum of valid (non-reversed) payments
 * Uses DECIMAL arithmetic to avoid floating point drift.
 */
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
    if (session.role === "PARENT" && session.parentId) {
      const { parentStudent } = await import("@/db/schema");
      const link = await db
        .select()
        .from(parentStudent)
        .where(
          and(
            eq(parentStudent.parentId, session.parentId),
            eq(parentStudent.studentId, id)
          )
        )
        .limit(1);
      if (!link.length) return jsonError("Forbidden", 403);
    }

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    if (!student) return jsonError("Student not found", 404);

    const obligations = await db
      .select()
      .from(feeObligations)
      .where(eq(feeObligations.studentId, id))
      .orderBy(feeObligations.dueDate);

    // MySQL rejects IN (); students with no obligations have no payments to load.
    const payments = obligations.length
      ? await db
          .select()
          .from(feePayments)
          .where(
            sql`${feePayments.obligationId} IN (${sql.join(
              obligations.map((o) => sql`${o.id}`),
              sql`, `
            )})`
          )
          .orderBy(feePayments.paidAt)
      : [];

    const totalObligation = obligations.reduce(
      (sum, o) => sum + Number(o.amount),
      0
    );
    const totalPaid = payments
      .filter((p) => !p.reversed)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Number((totalObligation - totalPaid).toFixed(2));

    const overdue = obligations
      .filter((o) => {
        const paidForThis = payments
          .filter((p) => p.obligationId === o.id && !p.reversed)
          .reduce((s, p) => s + Number(p.amount), 0);
        return Number(o.amount) - paidForThis > 0 && o.dueDate < new Date().toISOString().slice(0, 10);
      })
      .map((o) => o.id);

    return jsonOk({
      studentId: id,
      studentName: student.fullName,
      obligations: obligations.map((o) => ({ ...o, amount: Number(o.amount) })),
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      totalObligation,
      totalPaid,
      pending,
      overdue,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
