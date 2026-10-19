#!/usr/bin/env bash
# Actualiza el entorno QA con el código más reciente del repo y lo reconstruye.
# Uso (desde la raíz del repo, en el servidor):
#   ./scripts/deploy-qa.sh                 # git pull de la rama actual + rebuild + up
#   ./scripts/deploy-qa.sh qa              # cambia a la rama "qa" antes de actualizar
#   ./scripts/deploy-qa.sh qa --migrate    # además corre alembic upgrade head sobre qa_tms_db
#   ./scripts/deploy-qa.sh --no-pull       # solo rebuild (cuando ya copiaste el código a mano)
# Requisitos: .env lleno y el stack de prod arriba (QA usa su Postgres y su red).
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.qa.yml)
BRANCH=""; MIGRATE=0; PULL=1
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=1 ;;
    --no-pull) PULL=0 ;;
    -*) echo "Opción desconocida: $arg" >&2; exit 2 ;;
    *) BRANCH="$arg" ;;
  esac
done

[ -f .env ] || { echo "Falta .env (copia .env.qa.example y llénalo)" >&2; exit 1; }
docker network inspect tms3t-prod-net >/dev/null 2>&1 \
  || { echo "No existe la red tms3t-prod-net: levanta primero prod (docker-compose.prod.yml)" >&2; exit 1; }

if [ "$PULL" -eq 1 ]; then
  if [ -n "$BRANCH" ]; then git fetch origin "$BRANCH" && git checkout "$BRANCH"; fi
  git pull --ff-only
fi
echo ">> Código en: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"

# Las imágenes llevan el código adentro (no hay volúmenes de código en QA): hay que reconstruirlas.
"${COMPOSE[@]}" build --pull
"${COMPOSE[@]}" up -d --remove-orphans

# Espera a que el backend de QA quede healthy (db_qa_init termina solo y no entra en la espera).
CID=$("${COMPOSE[@]}" ps -q backend_qa)
for _ in $(seq 1 30); do
  STATE=$(docker inspect -f '{{.State.Health.Status}}' "$CID" 2>/dev/null || echo starting)
  [ "$STATE" = "healthy" ] && break
  sleep 5
done
[ "$STATE" = "healthy" ] || { echo "backend_qa no quedó healthy ($STATE). Revisa: ${COMPOSE[*]} logs backend_qa" >&2; exit 1; }

if [ "$MIGRATE" -eq 1 ]; then
  "${COMPOSE[@]}" --profile tools run --rm migrate_qa
fi

docker image prune -f >/dev/null
"${COMPOSE[@]}" ps
