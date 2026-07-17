#!/bin/bash

# =====================================================================
# ADMINISTRADOR DE TAREAS CRON - EL VIGILANTE COMPLETO DEL SAT
# =====================================================================

PROJECT_DIR="/home/desarrolloas/base-foundation/backend"
PYTHON_ENV="/home/desarrolloas/base-foundation/backend/venv/bin/python"
LOG_FILE="/home/desarrolloas/base-foundation/backend/scripts/finance_cron.log"

mkdir -p "/home/desarrolloas/base-foundation/backend/scripts"

echo "[$(date)] 🤖 Despertando a la suite de automatización del SAT..." >> "$LOG_FILE"
cd $PROJECT_DIR

# TAREA 1: Sincronizar el estatus real del SAT
echo "[$(date)] 🔄 1/3 Iniciando sincronización de realidad SAT..." >> "$LOG_FILE"
$PYTHON_ENV sincronizar_realidad_sat.py >> "$LOG_FILE" 2>&1

# TAREA 2: Ejecutar la limpieza de Cartas Porte duplicadas
echo "[$(date)] 🧹 2/3 Iniciando auditoría y cancelación de CPs..." >> "$LOG_FILE"
$PYTHON_ENV auditor_cp.py >> "$LOG_FILE" 2>&1

# =====================================================================
#  TAREA 3: PROCESAR LA COLA DE TIMBRADOS PENDIENTES (EL PARCHE FALTANTE)
# =====================================================================
echo "[$(date)] 🚀 3/3 Procesando cola de reintentos de Pagos y Facturas..." >> "$LOG_FILE"
# Nota: Ajusta el nombre del script ".py" según cómo lo hayas nombrado en tu backend
$PYTHON_ENV procesar_cola_sat.py >> "$LOG_FILE" 2>&1

echo "[$(date)] 😴 Todas las rondas terminadas. Volviendo a dormir." >> "$LOG_FILE"
echo "----------------------------------------------------------------" >> "$LOG_FILE"