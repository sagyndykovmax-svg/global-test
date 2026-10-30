import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/db";

// isAdmin без userId — владелец (вход из .env), с userId — сотрудник из таблицы User.
type SessionData = { isAdmin?: boolean; userId?: string };

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const HASH_BYTES = 64;

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
  if (!session.isAdmin) return false;
  if (!session.userId) return true;
  // Проверяем на каждый запрос, чтобы отключение сотрудника срабатывало сразу, а не при истечении cookie
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return Boolean(user?.active);
}

export async function requireOwner(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session.isAdmin && !session.userId);
}

export function isOwnerUsername(username: string): boolean {
  return username === (process.env.ADMIN_USERNAME ?? "admin");
}

export function checkCredentials(username: string, password: string): boolean {
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!p) return false;
  return isOwnerUsername(username) && password === p;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, HASH_BYTES);
  return `${salt}:${hash.toString("hex")}`;
}

/** Возвращает id активного сотрудника, если логин и пароль верны. */
export async function checkStaffCredentials(username: string, password: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user?.active) return null;
  const [salt, expected] = user.passwordHash.split(":");
  const actual = await scrypt(password, salt, HASH_BYTES);
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) ? user.id : null;
}
