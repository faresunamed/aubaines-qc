// Usage : npm run make-admin -- courriel@exemple.ca
// Le compte doit déjà exister (créé via /inscription).
import { pool } from "../lib/db";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage : npm run make-admin -- courriel@exemple.ca");
  process.exit(1);
}
const res = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id", [email]);
console.log(res.rowCount ? `✔ ${email} est maintenant administrateur.` : `✘ Aucun compte avec ${email}.`);
await pool.end();
process.exit(res.rowCount ? 0 : 1);
