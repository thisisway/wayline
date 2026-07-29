# Backup & Restore — Postgres do Wayline

## Fazer backup (manual)
No console do container **wayline-db**:
```bash
bash /caminho/backup.sh        # ou cole o conteúdo do backup.sh
```
Gera `/backups/wayline-AAAAMMDD-HHMMSS.sql.gz` e mantém os últimos 14 dias.

## Agendar (recomendado)
Duas opções:

**A. Cron no Easypanel** — no serviço do banco, crie um agendamento diário
(ex.: `0 3 * * *`) executando `bash /backup.sh`. Ajuste o caminho/volume.

**B. Cron da app** — reaproveite a rota já existente estilo `/api/cron/support`:
crie um `/api/cron/backup` que dispara o dump (ou um container cron separado
chamando `pg_dump`). Só faça isso se a app tiver acesso ao `pg_dump`.

> **Volume:** aponte `BACKUP_DIR` para um **volume persistente** do Easypanel,
> senão o backup some quando o container reinicia.

## Cópia off-site (importante)
Backup no mesmo servidor não protege contra perda do servidor. Sincronize a
pasta `/backups` para um bucket (S3/R2/Backblaze) — ex.: `rclone`/`aws s3 sync`
num segundo passo do cron. Você já usa S3 para anexos, então as credenciais
podem ser reaproveitadas.

## Restaurar
```bash
# 1) (opcional) recrie o banco limpo, ou restaure sobre o existente
gunzip -c /backups/wayline-AAAAMMDD-HHMMSS.sql.gz | psql -U wayline -d wayline
```
Teste a restauração num banco **de teste** de tempos em tempos — backup que
nunca foi restaurado não é backup.

## Checklist
- [ ] `backup.sh` agendado (diário) apontando para volume persistente
- [ ] Retenção definida (`BACKUP_KEEP_DAYS`, padrão 14)
- [ ] Cópia off-site (bucket) configurada
- [ ] Restauração testada pelo menos 1x
