// À planifier une fois par jour (cron). Usage : npm run alerts
import { closeDb } from "../lib/db";
import { runAlerts } from "../lib/run-alerts";

const { sent, examined } = await runAlerts();
console.log(`${sent} courriel(s) envoyé(s) sur ${examined} utilisateur(s) examiné(s).`);
await closeDb();
