import { BOT_UA } from "./bot";

/**
 * Affiche une page dans un vrai navigateur (Chromium sans interface) pour les circulaires
 * chargées par JavaScript. Même page que voit un visiteur : aucun contournement
 * (un 403 reste un refus, robots.txt est vérifié avant l'appel).
 */
export async function renderPage(url: string, opts: { executablePath?: string } = {}): Promise<{ status: number; html: string }> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: opts.executablePath || process.env.CHROMIUM_PATH || undefined });
  try {
    const ctx = await browser.newContext({ userAgent: BOT_UA, locale: "fr-CA", viewport: { width: 1280, height: 1800 } });
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Défilement pour déclencher le chargement différé des produits
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(700);
    }
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    return { status: res?.status() ?? 0, html: await page.content() };
  } finally {
    await browser.close();
  }
}
