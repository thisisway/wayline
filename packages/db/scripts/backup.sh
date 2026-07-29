#!/usr/bin/env bash
# Backup do Postgres do Wayline: dump comprimido + retenção.
# Rode DENTRO do container do banco (tem pg_dump e acesso local).
#
# Variáveis (com padrões):
#   POSTGRES_USER=wayline  POSTGRES_DB=wayline
#   BACKUP_DIR=/backups    BACKUP_KEEP_DAYS=14
#
# Uso:  bash backup.sh
set -euo pipefail

DIR="${BACKUP_DIR:-/backups}"
DB="${POSTGRES_DB:-wayline}"
USER="${POSTGRES_USER:-wayline}"
KEEP="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$DIR"
FILE="$DIR/wayline-$(date +%Y%m%d-%H%M%S).sql.gz"

# -Fc daria custom format (melhor p/ restore seletivo), mas .sql.gz é o mais
# portátil e simples de restaurar. ponytail: portável > sofisticado aqui.
pg_dump -U "$USER" -d "$DB" | gzip > "$FILE"

# Retenção: remove dumps mais antigos que KEEP dias.
find "$DIR" -name 'wayline-*.sql.gz' -mtime +"$KEEP" -delete

echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
