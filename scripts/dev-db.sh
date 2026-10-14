#!/usr/bin/env bash
# Démarre (et crée au besoin) un Postgres local de développement sur le port 5433.
# Postgres refuse de tourner en root : lancez ce script avec un utilisateur normal.
set -euo pipefail
BIN="node_modules/@embedded-postgres/linux-x64/native/bin"
if [ ! -f .pgdata/PG_VERSION ]; then
  echo postgres > .pgpw.tmp
  "$BIN/initdb" -D .pgdata --username=postgres --pwfile=.pgpw.tmp -A scram-sha-256 >/dev/null
  rm -f .pgpw.tmp
  FRESH=1
fi
"$BIN/pg_ctl" -D .pgdata -o "-p 5433" -l .pgdev.log start
if [ "${FRESH:-0}" = "1" ]; then
  sleep 2
  PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE aubaines;"
fi
echo "Postgres prêt : postgres://postgres:postgres@localhost:5433/aubaines"
