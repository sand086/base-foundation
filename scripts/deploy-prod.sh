#!/usr/bin/env bash
# Actualiza PRODUCCIÓN con el código más reciente del repo y reconstruye.
# Uso (desde la raíz del repo, en el servidor):
#   ./scripts/deploy-prod.sh                 # respaldo de BD + git pull + rebuild + up (confirma solo si hay terminal)
#   ./scripts/deploy-prod.sh main            # cambia a la rama "main" antes de actualizar
#   ./scripts/deploy-prod.sh main --migrate  # además corre alembic upgrade head sobre la BD de prod
#   ./scripts/deploy-prod.sh --no-pull       # solo rebuild (cuando ya copiaste el código a mano)
#   ./scripts/deploy-prod.sh --no-backup     # omite el respaldo previo de la BD
#   ./scripts/deploy-prod.sh --yes           # fuerza saltar la confirmación aunque haya terminal
# Requisitos: .env.prod lleno. Las imágenes llevan el código adentro: sin rebuild no hay cambios.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose --env-file .env.prod -f docker-compose.prod.yml)
BRANCH=""; MIGRATE=0; PULL=1; BACKUP=1; ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=1 ;;
    --no-pull) PULL=0 ;;
    --no-backup) BACKUP=0 ;;
    --yes) ASSUME_YES=1 ;;
    -*) echo "Opción desconocida: $arg" >&2; exit 2 ;;
    *) BRANCH="$arg" ;;
  esac
done

[ -f .env.prod ] || { echo "Falta .env.prod (copia .env.prod.example y llénalo)" >&2; exit 1; }

# Solo pregunta en terminal interactiva; desde CI/SSH sin TTY (GitHub Actions) corre directo.
if [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; then
  read -r -p "Vas a desplegar PRODUCCIÓN. ¿Continuar? [s/N] " ANS
  [ "$ANS" = "s" ] || [ "$ANS" = "S" ] || { echo "Cancelado."; exit 1; }
fi

if [ "$BACKUP" -eq 1 ] && [ -n "$("${COMPOSE[@]}" ps -q db 2>/dev/null)" ]; then
  mkdir -p backups
  FILE="backups/prod_$(date +%Y%m%d_%H%M%S).dump"
  "${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE"
  echo ">> Respaldo de BD: $FILE ($(du -h "$FILE" | cut -f1))"
fi

if [ "$PULL" -eq 1 ]; then
  if [ -n "$BRANCH" ]; then git fetch origin "$BRANCH" && git checkout "$BRANCH"; fi
  git pull --ff-only
fi
echo ">> Código en: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"

"${COMPOSE[@]}" build --pull
"${COMPOSE[@]}" up -d --remove-orphans

# Espera a que el backend quede healthy.
CID=$("${COMPOSE[@]}" ps -q backend)
for _ in $(seq 1 30); do
  STATE=$(docker inspect -f '{{.State.Health.Status}}' "$CID" 2>/dev/null || echo starting)
  [ "$STATE" = "healthy" ] && break
  sleep 5
done
[ "$STATE" = "healthy" ] || { echo "backend no quedó healthy ($STATE). Revisa: ${COMPOSE[*]} logs backend" >&2; exit 1; }

if [ "$MIGRATE" -eq 1 ]; then
  "${COMPOSE[@]}" --profile tools run --rm migrate
fi

docker image prune -f >/dev/null
"${COMPOSE[@]}" ps
