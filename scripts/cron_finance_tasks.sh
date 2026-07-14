#!/bin/bash

# =====================================================================
# ADMINISTRADOR DE TAREAS CRON - EL VIGILANTE ASÍNCRONO DEL SAT
# =====================================================================

# Configura las rutas (ajusta los paths si es necesario según tu servidor)
PROJECT_DIR="/home/desarrolloas/base-foundation/backend"
PYTHON_ENV="/home/desarrolloas/base-foundation/backend/venv/bin/python"
LOG_FILE="/home/desarrolloas/base-foundation/backend/scripts/finance_cron.log"

echo "[$(date)] 🤖 Despertando al Vigilante Asíncrono del SAT..." >> "$LOG_FILE"

# Nos movemos a la carpeta del backend para evitar problemas de imports
cd $PROJECT_DIR

# Ejecutamos el Robot Poller guardando la salida en el log
$PYTHON_ENV sincronizar_realidad_sat.py >> "$LOG_FILE" 2>&1

echo "[$(date)] 😴 Vigilante terminó su ronda y volvió a dormir." >> "$LOG_FILE"
echo "----------------------------------------------------------------" >> "$LOG_FILE"