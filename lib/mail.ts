// Utilisable aussi par les scripts (cron) : pas de "server-only" ici.
import { query } from "./db";

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

type Mail = { to: string; subject: string; text: string; headers?: Record<string, string> };

/**
 * Envoi de courriel.
 * - RESEND_API_KEY défini  → envoi réel via Resend (https://resend.com), MAIL_FROM requis.
 * - sinon (développement)  → le courriel est écrit dans la table email_outbox et la console.
 */
export async function sendMail({ to, subject, text, headers }: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await query("INSERT INTO email_outbox (to_email, subject, body) VALUES ($1,$2,$3)", [to, subject, text]);
    console.log(`\n[courriel dev] à ${to} — ${subject}\n${text}\n`);
    return;
  }
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM manquant");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, ...(headers ? { headers } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend a répondu ${res.status}`);
}
