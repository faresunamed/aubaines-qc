#!/usr/bin/env bash
# Lance les tests e2e avec le site en MODE API : l'application n'a AUCUNE adresse Postgres
# (DATABASE_URL vide) ; elle ne peut joindre la base que par le simulateur de l'API Supabase.
# Prérequis : base locale démarrée (npm run db:dev), npm run build. Usage : npm run e2e:api
set -uo pipefail
KEY="cle-locale-de-test-pas-un-secret"
# setsid : chaque service dans son propre groupe, tué en entier (npx lance des processus enfants)
cleanup() { for p in "${MOCK_PID:-}" "${APP_PID:-}"; do [ -n "$p" ] && kill -TERM -- "-$p" 2>/dev/null; done; wait 2>/dev/null; }
trap cleanup EXIT

MOCK_KEY="$KEY" setsid npx tsx scripts/mock-supabase.ts > .mock.log 2>&1 &
MOCK_PID=$!
for i in $(seq 1 30); do curl -s localhost:54321/__stats >/dev/null 2>&1 && break; sleep 0.5; done

DATABASE_URL="" POSTGRES_URL="" SUPABASE_URL="http://localhost:54321" SUPABASE_SECRET_KEY="$KEY" \
  setsid npx next start -p 3100 > .next-server-api.log 2>&1 &
APP_PID=$!
for i in $(seq 1 40); do curl -s localhost:3100/api/health >/dev/null 2>&1 && break; sleep 0.5; done

echo "== /api/health (mode attendu : api)"; curl -s localhost:3100/api/health; echo
BASE_URL=http://localhost:3100 npm run e2e 2>&1 | grep -vE "extra certs|^$|^>"
RC=${PIPESTATUS[0]}

echo "== auto-tests du mode API (types, tableaux, erreurs)"
SUPABASE_URL="http://localhost:54321" SUPABASE_SECRET_KEY="$KEY" npx tsx scripts/api-selftest.ts 2>&1 | grep -vE "extra certs"; RC2=${PIPESTATUS[0]}
SUPABASE_URL="http://localhost:54321" SUPABASE_SECRET_KEY="mauvaise" EXPECT_BAD_KEY=1 npx tsx scripts/api-selftest.ts 2>&1 | grep -vE "extra certs"; RC3=${PIPESTATUS[0]}
echo "== envoi des alertes en mode API"
SUPABASE_URL="http://localhost:54321" SUPABASE_SECRET_KEY="$KEY" npx tsx scripts/send-alerts.ts 2>&1 | grep -vE "extra certs|\[courriel dev\]" | tail -2
echo "== statistiques du simulateur"; curl -s localhost:54321/__stats; echo
[ "$RC" = 0 ] && [ "$RC2" = 0 ] && [ "$RC3" = 0 ]; exit $?
