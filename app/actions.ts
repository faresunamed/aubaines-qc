"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { createSession, destroySession, getUser } from "@/lib/auth";
import { APP_URL, sendMail } from "@/lib/mail";
import { consumeToken, createToken } from "@/lib/tokens";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export type FormState = { error?: string; message?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash factice pour que la durée de connexion ne révèle pas si le courriel existe.
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-factice", 10);
const TOO_MANY = "Trop de tentatives. Réessayez dans quelques minutes.";

async function sendVerification(userId: number, email: string, name: string) {
  const token = await createToken(userId, "verify", 60 * 24);
  await sendMail({
    to: email,
    subject: "Confirmez votre courriel — Aubaines QC",
    text:
      `Bonjour ${name},\n\nConfirmez votre adresse courriel pour activer les alertes et le portail commerçant :\n` +
      `${APP_URL}/verifier?token=${token}\n\nCe lien est valide 24 heures. ` +
      `Si vous n'avez pas créé de compte, ignorez ce message.`,
  });
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const accepted = form.get("terms") === "on";

  if (name.length < 2) return { error: "Entrez votre prénom." };
  if (!EMAIL_RE.test(email)) return { error: "Courriel invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== String(form.get("password2") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };
  if (!accepted) return { error: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité." };
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) return { error: TOO_MANY };

  const hash = await bcrypt.hash(password, 10);
  const rows = await query<{ id: number }>(
    `INSERT INTO users (email, name, password_hash, unsubscribe_token) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, hash, randomBytes(24).toString("hex")],
  );
  if (rows.length === 0) return { error: "Un compte existe déjà avec ce courriel." };

  await sendVerification(rows[0].id, email, name);
  await createSession(rows[0].id);
  redirect("/?bienvenue=1");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 20, 900)) || !(await rateLimit(`login-email:${email}`, 8, 900)))
    return { error: TOO_MANY };

  const rows = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  const ok = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows[0] || !ok) return { error: "Courriel ou mot de passe incorrect." };

  await createSession(rows[0].id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function toggleFavorite(promotionId: number) {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const removed = await query(
    "DELETE FROM favorites WHERE user_id = $1 AND promotion_id = $2 RETURNING 1",
    [user.id, promotionId],
  );
  if (removed.length === 0) {
    await query(
      "INSERT INTO favorites (user_id, promotion_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [user.id, promotionId],
    );
  }
  revalidatePath("/", "layout");
}

// ---- Vérification du courriel ----

export async function resendVerification(): Promise<void> {
  const user = await getUser();
  if (!user || user.verified) redirect("/");
  if (await rateLimit(`resend:${user.id}`, 3, 3600)) {
    await sendVerification(user.id, user.email, user.name);
  }
  redirect("/?verification=envoyee");
}

export async function verifyEmail(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  const userId = await consumeToken(token, "verify");
  if (!userId) redirect("/verifier?erreur=1");
  await query("UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL", [userId]);
  redirect("/verifier?ok=1");
}

// ---- Mot de passe oublié ----

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Courriel invalide." };
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 3600)) || !(await rateLimit(`forgot-email:${email}`, 3, 3600)))
    return { error: TOO_MANY };

  const [u] = await query<{ id: number; name: string }>("SELECT id, name FROM users WHERE email = $1", [email]);
  if (u) {
    const token = await createToken(u.id, "reset", 60);
    await sendMail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — Aubaines QC",
      text:
        `Bonjour ${u.name},\n\nPour choisir un nouveau mot de passe :\n${APP_URL}/reinitialiser?token=${token}\n\n` +
        `Ce lien est valide 1 heure. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.`,
    });
  }
  // Même réponse que le compte existe ou non (pas de fuite d'information).
  return { message: "Si un compte existe avec ce courriel, un lien de réinitialisation vient d'être envoyé." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== String(form.get("password2") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };

  const userId = await consumeToken(token, "reset");
  if (!userId) return { error: "Ce lien est invalide ou expiré. Demandez-en un nouveau." };

  const hash = await bcrypt.hash(password, 10);
  // session_version + 1 : déconnecte tous les appareils. Le lien reçu prouve aussi le courriel.
  await query(
    `UPDATE users SET password_hash = $2, session_version = session_version + 1,
       email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`,
    [userId, hash],
  );
  await createSession(userId);
  redirect("/?motdepasse=modifie");
}
