import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

type SessionData = { isAdmin?: boolean };

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-only-secret-replace-me-with-64-hex-chars-dev-only-secret-replace-me",
  cookieName: "global_test_admin",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session.isAdmin);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME ?? "admin";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!p) return false;
  return username === u && password === p;
}
