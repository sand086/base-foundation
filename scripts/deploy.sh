#!/bin/sh
# Despliegue en el servidor. Lo invoca GitHub Actions por SSH:  scripts/deploy.sh <qa|prod>
# Cada ambiente tiene su propio checkout (no pueden compartir uno: cada rama es distinta):
#   prod -> /opt/app/3tapp     (rama main)  con .env
#   qa   -> /opt/app/3tapp-qa  (rama qa)    con .env
# El .env de cada checkout NO está en git: debe existir ya en cada uno (compose lo lee solo).
# No corre migraciones ni toca los volúmenes (BD, certs, n8n_data).
set -eu

ENVIRONMENT="${1:?uso: deploy.sh <qa|prod>}"

case "$ENVIRONMENT" in
  prod) DIR=/opt/app/3tapp;    BRANCH=main; COMPOSE_FILE=docker-compose.prod.yml ;;
  qa)   DIR=/opt/app/3tapp-qa; BRANCH=qa;   COMPOSE_FILE=docker-compose.qa.yml ;;
  *) echo "Ambiente desconocido: $ENVIRONMENT (usa qa o prod)" >&2; exit 1 ;;
esac

cd "$DIR"
[ -f .env ] || { echo "Falta $DIR/.env" >&2; exit 1; }

echo ">> [$ENVIRONMENT] actualizando $BRANCH"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo ">> [$ENVIRONMENT] construyendo y levantando"
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo ">> [$ENVIRONMENT] estado"
docker compose -f "$COMPOSE_FILE" ps

docker image prune -f >/dev/null
echo ">> [$ENVIRONMENT] listo: $(git rev-parse --short HEAD)"
