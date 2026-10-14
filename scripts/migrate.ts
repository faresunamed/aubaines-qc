import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { pgConfig } from "../lib/pg-config";

const { max: _max, ...clientConfig } = pgConfig();
const client = new Client(clientConfig);
await client.connect();
await client.query(fs.readFileSync(path.resolve("db/schema.sql"), "utf8"));
await client.end();

// Resynchronise les catégories depuis lib/categories.ts (source de vérité du code).
const { ensureCategories } = await import("../lib/ingest");
const { pool } = await import("../lib/db");
await ensureCategories();
await pool.end();
console.log("Schéma appliqué.");
