// Génère le SQL pour changer un mot de passe directement dans la base (Supabase SQL Editor).
// Usage : NEW_PASSWORD='votre-mot-de-passe' npx tsx scripts/hash-password.ts courriel@exemple.com
import bcrypt from "bcryptjs";
const email = process.argv[2]?.trim().toLowerCase();
const pw = process.env.NEW_PASSWORD ?? "";
if (!email || pw.length < 8) { console.error("Usage : NEW_PASSWORD='(8+ caractères)' npx tsx scripts/hash-password.ts courriel"); process.exit(1); }
const hash = bcrypt.hashSync(pw, 10);
console.log(`UPDATE users SET password_hash = '${hash}', session_version = session_version + 1\nWHERE email = '${email.replace(/'/g, "''")}';`);
