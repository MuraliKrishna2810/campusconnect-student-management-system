import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feeObligations, feePayments } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(await getSession(), ["STAFF"]);
    const { id } = await params;
    const obligationId = Number(id);
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const paymentReference = String(body.paymentReference || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("amount must be a positive number", 400);
    }
    if (!paymentReference) {
      return jsonError("paymentReference is required", 400);
    }

    const [oblig] = await db
      .select()
      .from(feeObligations)
      .where(eq(feeObligations.id, obligationId))
      .limit(1);
    if (!oblig) return jsonError("Fee obligation not found", 404);

    // Prevent double-counting: reject if reference already used (active)
    const [existingRef] = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.paymentReference, paymentReference))
      .limit(1);
    if (existingRef && !existingRef.reversed) {
      return jsonError("Payment reference already used", 409);
    }

    // Prevent overpayment: total valid payments for obligation + this <= obligation amount
    const existingTotal = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.obligationId, obligationId));
    const paidSoFar = existingTotal
      .filter((p) => !p.reversed)
      .reduce((s, p) => s + Number(p.amount), 0);
    if (paidSoFar + amount > Number(oblig.amount)) {
      return jsonError(
        `Would exceed obligation amount. Already paid ${paidSoFar.toFixed(2)} of ${oblig.amount}.`,
        400
      );
    }

    const [inserted] = await db
      .insert(feePayments)
      .values({
        obligationId,
        amount: String(amount),
        paymentReference,
        recordedByStaffId: session.staffId!,
      })
      .$returningId();
    const [p] = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.id, inserted.id))
      .limit(1);
    return jsonOk(p, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
