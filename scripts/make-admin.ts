// Usage : npm run make-admin -- courriel@exemple.ca
// Le compte doit déjà exister (créé via /inscription).
import { closeDb, query } from "../lib/db";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage : npm run make-admin -- courriel@exemple.ca");
  process.exit(1);
}
const rows = await query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id", [email]);
console.log(rows.length ? `✔ ${email} est maintenant administrateur.` : `✘ Aucun compte avec ${email}.`);
await closeDb();
process.exit(rows.length ? 0 : 1);
