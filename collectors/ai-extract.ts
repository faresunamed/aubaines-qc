import { BOT_UA } from "../lib/bot";
import { renderPage } from "../lib/render";
import { chunkText, htmlToText, robotsAllows, validateItems, type ModelCaller } from "../lib/extract";
import type { Collector, EstablishmentInfo, RawPromotion } from "./types";

export type AiSourceConfig = {
  establishment: EstablishmentInfo;
  urls: string[];
  /** DOIT être true : vous confirmez avoir le droit d'utiliser ces pages (conditions, robots.txt). */
  authorized: boolean;
  notes?: string;
  /** true = afficher la page dans un navigateur (circulaires chargées par JavaScript). */
  render?: boolean;
};

export { BOT_UA };
const MAX_BYTES = 2_000_000;

async function getText(url: string, accept: string): Promise<{ ok: boolean; status: number; body: string; type: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": BOT_UA, accept, "accept-language": "fr-CA,fr;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, body: buf.subarray(0, MAX_BYTES).toString("utf8"), type: res.headers.get("content-type") ?? "" };
}

export type AiRunLog = { url: string; status: string; found: number; rejected: { title: string; reason: string }[] };

export function aiExtractCollector(cfg: AiSourceConfig, model: ModelCaller, log?: (l: AiRunLog) => void): Collector {
  return {
    id: `ai-${cfg.establishment.slug}`,
    establishment: cfg.establishment,
    source: "ai",
    reviewStatus: "pending",
    async fetch(): Promise<RawPromotion[]> {
      if (cfg.authorized !== true) throw new Error(`${cfg.establishment.name} : "authorized": true requis (voir README)`);
      const today = new Date().toISOString().slice(0, 10);
      const all: RawPromotion[] = [];
      for (const url of cfg.urls) {
        const entry: AiRunLog = { url, status: "ok", found: 0, rejected: [] };
        try {
          const u = new URL(url);
          if (u.protocol !== "https:") throw new Error("https requis");
          try {
            const r = await getText(`${u.origin}/robots.txt`, "text/plain");
            if (r.ok && !robotsAllows(r.body, u.pathname + u.search)) { entry.status = "interdit par robots.txt"; log?.(entry); continue; }
          } catch { /* robots.txt injoignable : on continue */ }
          let html: string;
          if (cfg.render) {
            const r = await renderPage(url);
            if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
            html = r.html;
          } else {
            const page = await getText(url, "text/html");
            if (!page.ok) throw new Error(`HTTP ${page.status}`);
            if (!/html|text/i.test(page.type)) throw new Error(`type non pris en charge (${page.type})`);
            html = page.body;
          }
          const text = htmlToText(html);
          if (text.length < 200) throw new Error("page vide (rendu JavaScript ?)");
          for (const chunk of chunkText(text)) {
            const raw = await model(chunk, { establishment: cfg.establishment.name, today });
            const v = validateItems(raw, chunk, url, cfg.establishment.slug, today);
            entry.found += v.items.length;
            entry.rejected.push(...v.rejected);
            all.push(...v.items);
          }
        } catch (e) {
          entry.status = `erreur : ${(e as Error).message}`;
        }
        log?.(entry);
      }
      return all;
    },
  };
}
