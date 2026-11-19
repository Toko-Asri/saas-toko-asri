#!/usr/bin/env bash
# Uji skema SCM di Postgres LOKAL sementara (bukan Supabase). Contoh:
#   PGDATABASE=asri_test supabase/tests/run.sh
# Membuat ulang skema public, memuat stub auth + migration, menjalankan uji,
# lalu memuat seed dua kali (harus idempoten).
set -euo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="psql -v ON_ERROR_STOP=1 -q"
$PSQL -c 'drop schema if exists public cascade; create schema public; grant usage on schema public to authenticated, anon;' 2>/dev/null || \
  $PSQL -c 'drop schema public cascade; create schema public;'
$PSQL -f "$D/tests/00_auth_stub.sql" 2>/dev/null
for m in "$D"/migrations/*.sql; do $PSQL -f "$m"; done
$PSQL -f "$D/tests/scm_test.sql"
$PSQL -f "$D/tests/erp_test.sql"
$PSQL -f "$D/tests/crm_test.sql"
$PSQL -f "$D/tests/dashboard_test.sql"
$PSQL -f "$D/tests/integrasi_test.sql"
$PSQL -f "$D/seed.sql"; $PSQL -f "$D/seed.sql"
echo "SEED OK (idempoten)"
