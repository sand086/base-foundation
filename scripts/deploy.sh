#!/bin/sh
# Despliegue en el servidor. Lo invoca GitHub Actions por SSH:  scripts/deploy.sh <qa|prod>
# Cada ambiente tiene su propio checkout (no pueden compartir uno: cada rama es distinta):
#   prod -> /opt/app/3tapp     (rama main)  con .env.prod
#   qa   -> /opt/app/3tapp-qa  (rama qa)    con .env.qa
# Los .env.* NO están en git: deben existir ya en cada checkout.
# No corre migraciones ni toca los volúmenes (BD, certs, n8n_data).
set -eu

ENVIRONMENT="${1:?uso: deploy.sh <qa|prod>}"

case "$ENVIRONMENT" in
  prod) DIR=/opt/app/3tapp;    BRANCH=main; ENV_FILE=.env.prod; COMPOSE_FILE=docker-compose.prod.yml ;;
  qa)   DIR=/opt/app/3tapp-qa; BRANCH=qa;   ENV_FILE=.env.qa;   COMPOSE_FILE=docker-compose.qa.yml ;;
  *) echo "Ambiente desconocido: $ENVIRONMENT (usa qa o prod)" >&2; exit 1 ;;
esac

cd "$DIR"
[ -f "$ENV_FILE" ] || { echo "Falta $DIR/$ENV_FILE" >&2; exit 1; }

echo ">> [$ENVIRONMENT] actualizando $BRANCH"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo ">> [$ENVIRONMENT] construyendo y levantando"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo ">> [$ENVIRONMENT] estado"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

docker image prune -f >/dev/null
echo ">> [$ENVIRONMENT] listo: $(git rev-parse --short HEAD)"
