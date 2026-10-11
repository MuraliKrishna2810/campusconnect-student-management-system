import { jsonOk } from "@/lib/api";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const res = jsonOk({ loggedOut: true });
  res.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
