import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, students, parents, staffProfiles } from "@/db/schema";
import { verifyPassword, signToken, getSessionCookieOptions } from "@/lib/auth";
import { jsonOk, jsonError, handleRouteError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user || !user.active) {
      return jsonError("Invalid credentials", 401);
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return jsonError("Invalid credentials", 401);

    const token = await signToken({ sub: String(user.id), role: user.role });

    let profile: Record<string, unknown> = {};
    if (user.role === "STUDENT") {
      const [s] = await db
        .select()
        .from(students)
        .where(eq(students.userId, user.id))
        .limit(1);
      if (s) profile = { studentId: s.id, fullName: s.fullName, admissionNumber: s.admissionNumber };
    } else if (user.role === "PARENT") {
      const [p] = await db
        .select()
        .from(parents)
        .where(eq(parents.userId, user.id))
        .limit(1);
      if (p) profile = { parentId: p.id, fullName: p.fullName };
    } else {
      const [sp] = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, user.id))
        .limit(1);
      if (sp) profile = { staffId: sp.id, employeeId: sp.employeeId, designation: sp.designation };
    }

    const res = jsonOk({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        ...profile,
      },
    });
    const opts = getSessionCookieOptions();
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (err) {
    return handleRouteError(err);
  }
}
