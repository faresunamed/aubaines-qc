import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aubaines",
});
await client.connect();
await client.query(fs.readFileSync(path.resolve("db/schema.sql"), "utf8"));
await client.end();

// Resynchronise les catégories depuis lib/categories.ts (source de vérité du code).
const { ensureCategories } = await import("../lib/ingest");
const { pool } = await import("../lib/db");
await ensureCategories();
await pool.end();
console.log("Schéma appliqué.");
