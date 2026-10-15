// Change le mot de passe d'un compte. Le mot de passe vient de la variable NEW_PASSWORD (jamais en argument).
// Local : NEW_PASSWORD='...' npx tsx scripts/set-password.ts courriel
// GitHub : workflow « Changer un mot de passe » (secret NEW_PASSWORD).
import bcrypt from "bcryptjs";
import { closeDb, query } from "../lib/db";

const email = process.argv[2]?.trim().toLowerCase();
const pw = process.env.NEW_PASSWORD ?? "";
if (!email || pw.length < 8) { console.error("Courriel requis et NEW_PASSWORD de 8 caractères minimum."); process.exit(1); }
const rows = await query(
  "UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE email = $1 RETURNING id",
  [email, bcrypt.hashSync(pw, 10)]);
console.log(rows.length ? `✔ Mot de passe changé pour ${email}.` : `✘ Aucun compte avec ${email}.`);
await closeDb();
process.exit(rows.length ? 0 : 1);
