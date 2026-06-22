#!/bin/bash

# =====================================================================
# ADMINISTRADOR DE TAREAS CRON - MÓDULO FINANZAS
# =====================================================================

# Carpeta de logs dentro del proyecto
LOG_FILE="/home/desarrolloas/base-foundation/scripts/finance_cron.log"

echo "[$(date)] Iniciando sincronización automática de cancelaciones SAT..." >> "$LOG_FILE"

# Ejecutar el endpoint de FastAPI (Ajusta el puerto 8000 si tu backend corre en otro)
curl -X GET http://localhost:8000/api/finance/receivables/payments/sync-cancellation-status >> "$LOG_FILE" 2>&1

echo -e "\n[$(date)] Sincronización terminada.\n------------------------------------------------" >> "$LOG_FILE"
