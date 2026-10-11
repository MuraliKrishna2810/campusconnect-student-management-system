import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export type UserRole = "STAFF" | "STUDENT" | "PARENT";

export interface TokenPayload {
  sub: string; // userId as string
  role: UserRole;
}

const JWT_SECRET_ENV = process.env.JWT_SECRET || "dev-campusconnect-secret-change-me";
const secretBytes = new TextEncoder().encode(JWT_SECRET_ENV);

const COOKIE_NAME = "cc_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(secretBytes);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes);
    return {
      sub: String(payload.sub),
      role: (payload.role as UserRole) ?? "STUDENT",
    };
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}
