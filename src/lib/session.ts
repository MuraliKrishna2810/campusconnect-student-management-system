import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, students, parents, staffProfiles } from "@/db/schema";
import {
  getSessionCookieName,
  verifyToken,
  type UserRole,
} from "@/lib/auth";

export interface SessionUser {
  userId: number;
  email: string;
  role: UserRole;
  displayName: string;
  staffId?: number;
  studentId?: number;
  parentId?: number;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !user.active) return null;

  const base: SessionUser = {
    userId: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };

  if (user.role === "STAFF") {
    const [sp] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, user.id))
      .limit(1);
    if (sp) base.staffId = sp.id;
  } else if (user.role === "STUDENT") {
    const [st] = await db
      .select()
      .from(students)
      .where(eq(students.userId, user.id))
      .limit(1);
    if (st && st.active) base.studentId = st.id;
  } else if (user.role === "PARENT") {
    const [p] = await db
      .select()
      .from(parents)
      .where(eq(parents.userId, user.id))
      .limit(1);
    if (p) base.parentId = p.id;
  }
  return base;
}

export function requireRole(
  session: SessionUser | null,
  roles: UserRole[]
): SessionUser {
  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }
  if (!roles.includes(session.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
