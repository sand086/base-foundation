#!/bin/sh
# Primer arranque de n8n: importa los workflows de ./n8n/workflows y activa los crones seguros.
# Se ejecuta UNA sola vez (marca .seeded en el volumen). Después n8n es dueño de sus workflows:
# lo que edites en la UI no se pisa al reiniciar. Para re-sembrar: borra /home/node/.n8n/.seeded.
set -e
MARK=/home/node/.n8n/.seeded
if [ ! -f "$MARK" ]; then
  n8n import:workflow --separate --input=/workflows
  for id in cron-sat-retry-queue cron-sat-retry-cancellations cron-rep-cancellation-status; do
    n8n update:workflow --id="$id" --active=true
  done
  touch "$MARK"
fi
exec n8n start
