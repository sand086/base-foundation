#!/bin/bash

# =====================================================================
# ADMINISTRADOR DE TAREAS CRON - EL VIGILANTE COMPLETO DEL SAT
# =====================================================================

# Configura las rutas del proyecto
PROJECT_DIR="/home/desarrolloas/base-foundation/backend"
PYTHON_ENV="/home/desarrolloas/base-foundation/backend/venv/bin/python"
LOG_FILE="/home/desarrolloas/base-foundation/backend/scripts/finance_cron.log"

# Asegurar que la carpeta de logs exista para evitar errores de escritura
mkdir -p "/home/desarrolloas/base-foundation/backend/scripts"

echo "[$(date)] 🤖 Despertando a la suite de automatización del SAT..." >> "$LOG_FILE"

# Nos movemos a la carpeta del backend para evitar problemas de imports
cd $PROJECT_DIR

# TAREA 1: Sincronizar el estatus real del SAT hacia nuestra Base de Datos local
echo "[$(date)] 🔄 1/2 Iniciando sincronización de realidad SAT..." >> "$LOG_FILE"
$PYTHON_ENV sincronizar_realidad_sat.py >> "$LOG_FILE" 2>&1

# TAREA 2: Ejecutar la limpieza inteligente de Cartas Porte duplicadas (Ventana móvil de 3 días)
echo "[$(date)] 🧹 2/2 Iniciando auditoría y cancelación de CPs duplicadas..." >> "$LOG_FILE"
$PYTHON_ENV auditor_cp.py >> "$LOG_FILE" 2>&1

echo "[$(date)] 😴 Todas las rondas terminadas. Volviendo a dormir." >> "$LOG_FILE"
echo "----------------------------------------------------------------" >> "$LOG_FILE"