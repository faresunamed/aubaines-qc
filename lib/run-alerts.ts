import { randomBytes } from "node:crypto";
import { query } from "./db";
import { APP_URL, sendMail } from "./mail";
import { findAlertMatches, formatMatch, type AlertRow, type Match } from "./alerts";

/**
 * Envoie un courriel récapitulatif par utilisateur :
 *   - nouvelles offres correspondant à ses alertes
 *   - rappel pour ses favoris qui se terminent dans 2 jours ou moins
 */
export async function runAlerts(): Promise<{ sent: number; examined: number }> {
const startedAt = new Date();


const users = await query<{ id: number; email: string; name: string; unsubscribe_token: string | null }>(
  `SELECT id, email, name, unsubscribe_token FROM users
   WHERE email_verified_at IS NOT NULL AND alerts_opt_out = FALSE
     AND (EXISTS (SELECT 1 FROM alerts a WHERE a.user_id = users.id)
          OR EXISTS (SELECT 1 FROM favorites f WHERE f.user_id = users.id))`,
);

let sent = 0;
for (const u of users) {
  const sections: string[] = [];

  const alerts = await query<AlertRow>("SELECT * FROM alerts WHERE user_id = $1", [u.id]);
  const seen = new Set<number>();
  for (const a of alerts) {
    const fresh = (await findAlertMatches(a)).filter((m: Match) => !seen.has(m.id));
    fresh.forEach((m) => seen.add(m.id));
    if (fresh.length) sections.push(`Alerte « ${a.keyword || "toutes les offres"} »\n${fresh.map(formatMatch).join("\n")}`);
  }

  const ending = await query<Match & { fav_promo: number }>(
    `SELECT p.id, p.title, p.price, p.regular_price, p.discount_percent, e.name AS establishment_name,
            to_char(p.valid_to,'YYYY-MM-DD') AS valid_to
     FROM favorites f JOIN promotions p ON p.id = f.promotion_id
     JOIN establishments e ON e.id = p.establishment_id
     WHERE f.user_id = $1 AND f.reminded_at IS NULL AND p.status = 'published'
       AND p.valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + 2`,
    [u.id],
  );
  if (ending.length) sections.push(`Vos favoris qui se terminent bientôt\n${ending.map(formatMatch).join("\n")}`);

  if (sections.length) {
    let token = u.unsubscribe_token;
    if (!token) {
      token = randomBytes(24).toString("hex");
      await query("UPDATE users SET unsubscribe_token = $2 WHERE id = $1", [u.id, token]);
    }
    const unsub = `${APP_URL}/desabonnement?token=${token}`;
    try {
      await sendMail({
        to: u.email,
        subject: `Aubaines QC : ${seen.size + ending.length} offre${seen.size + ending.length > 1 ? "s" : ""} pour vous`,
        text:
          `Bonjour ${u.name},\n\n${sections.join("\n\n")}\n\nVoir toutes les promotions : ${APP_URL}\n\n` +
          `Gérer mes alertes : ${APP_URL}/alertes\nSe désabonner de ces courriels : ${unsub}`,
        headers: { "List-Unsubscribe": `<${unsub}>` },
      });
      sent++;
      if (ending.length) {
        await query(
          "UPDATE favorites SET reminded_at = now() WHERE user_id = $1 AND promotion_id = ANY($2::int[])",
          [u.id, ending.map((e) => e.id)],
        );
      }
    } catch (e) {
      console.error(`✘ ${u.email}:`, (e as Error).message);
      continue; // on ne marque pas les alertes comme vérifiées : nouvelle tentative au prochain passage
    }
  }
  // Les alertes avancent seulement jusqu'au début de CE passage (rien n'est perdu).
  await query("UPDATE alerts SET last_checked_at = $2 WHERE user_id = $1", [u.id, startedAt]);
}


return { sent, examined: users.length };
}
