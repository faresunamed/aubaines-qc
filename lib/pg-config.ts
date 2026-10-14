// Configuration de connexion Postgres partagée par l'application et les scripts.
//
// Adresse lue dans l'ordre : DATABASE_URL, puis POSTGRES_URL (variable créée par
// l'intégration Vercel ↔ Supabase), sinon la base locale de développement.
//
// SSL : hors localhost, la connexion est chiffrée.
//  - DATABASE_CA (certificat PEM, « \n » acceptés) → le certificat du serveur est VÉRIFIÉ.
//  - sinon → chiffrée mais sans vérification du certificat (le CA de Supabase n'est pas
//    dans le magasin de Node). Fournissez DATABASE_CA pour une vérification complète.
// Les paramètres sslmode / supa de l'adresse sont retirés : le driver `pg` traite
// sslmode=require comme « verify-full », ce qui échoue avec le CA de Supabase.
import type { PoolConfig } from "pg";

const LOCAL_DEFAULT = "postgres://postgres:postgres@localhost:5433/aubaines";

/**
 * Adresse configurée dans l'environnement, ou undefined.
 * Ordre : DATABASE_URL, POSTGRES_URL, une variable se terminant par _POSTGRES_URL
 * (intégration Vercel avec préfixe personnalisé), puis toute variable dont la valeur
 * est une adresse postgres:// (hors NON_POOLING / PRISMA).
 */
export function configuredDbUrl(): string | undefined {
  const direct = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (direct) return direct;
  const keys = Object.keys(process.env).filter((k) => process.env[k]);
  const prefixed = keys.find((k) => /_POSTGRES_URL$/.test(k));
  if (prefixed) return process.env[prefixed];
  const any = keys.find(
    (k) => /^postgres(ql)?:\/\//.test(process.env[k]!) && !/NON_POOLING|PRISMA/.test(k),
  );
  return any ? process.env[any] : undefined;
}

export function pgConfig(): PoolConfig {
  const raw = configuredDbUrl() || LOCAL_DEFAULT;

  let connectionString = raw;
  let host = "localhost";
  try {
    const url = new URL(raw);
    host = url.hostname;
    url.searchParams.delete("sslmode");
    url.searchParams.delete("supa");
    connectionString = url.toString();
  } catch {
    // adresse non analysable : on la laisse telle quelle, pg signalera l'erreur
  }

  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  const ca = process.env.DATABASE_CA?.replace(/\\n/g, "\n");
  const ssl = local ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };

  // Petit pool par instance : en « serverless », chaque instance a le sien.
  const max = Number(process.env.DATABASE_POOL_MAX) || (local ? 10 : 3);
  return { connectionString, ssl, max };
}
