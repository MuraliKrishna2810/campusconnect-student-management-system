import { NextResponse } from "next/server";
import { AuthError } from "@/lib/session";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return jsonError(err.message, err.status);
  }
  console.error("[route-error]", err);
  const message = err instanceof Error ? err.message : "Internal error";
  return jsonError(message, 500);
}
