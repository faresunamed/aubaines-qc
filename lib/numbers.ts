/** "3,99", "3.99 $", "1 299,00" → nombre ; vide/invalide → null. */
export function parseMoney(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
