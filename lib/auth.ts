import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { query } from "./db";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET manquant ou trop court");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const [u] = await query<{ session_version: number }>(
    "SELECT session_version FROM users WHERE id = $1",
    [userId],
  );
  const token = await new SignJWT({ uid: userId, sv: u.session_version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type Role = "user" | "merchant" | "admin";
export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
};

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const rows = await query<SessionUser & { session_version: number }>(
      `SELECT id, email, name, role, (email_verified_at IS NOT NULL) AS verified, session_version
       FROM users WHERE id = $1`,
      [payload.uid as number],
    );
    const u = rows[0];
    if (!u || u.session_version !== payload.sv) return null; // session révoquée
    return { id: u.id, email: u.email, name: u.name, role: u.role, verified: u.verified };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/connexion");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin" || !u.verified) redirect("/");
  return u;
}

/** Commerçant approuvé et vérifié ; renvoie aussi l'établissement lié. */
export async function requireMerchant() {
  const u = await requireUser();
  if (!u.verified) redirect("/commercant");
  const [m] = await query<{ status: string; establishment_id: number | null; business_name: string }>(
    "SELECT status, establishment_id, business_name FROM merchant_profiles WHERE user_id = $1",
    [u.id],
  );
  if (!m || m.status !== "approved" || !m.establishment_id) redirect("/commercant");
  return { user: u, establishmentId: m.establishment_id, businessName: m.business_name };
}
