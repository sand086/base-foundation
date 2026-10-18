# Docker

```bash
cp .env.example .env            # y rellena DB_USER, DB_PASSWORD, SECRET_KEY, N8N_ENCRYPTION_KEY…
# Dev (hot reload):  front :8080  back :8000  n8n :5678  db 127.0.0.1:${DB_HOST_PORT}
docker compose -f docker-compose.dev.yml up --build
# Prod:              solo nginx (:FRONTEND_PORT) público; db/back internos; n8n en 127.0.0.1
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
# QA (necesita prod arriba):
docker compose --env-file .env.qa -f docker-compose.qa.yml up -d --build
```

- **BD**: el servicio `db` arranca vacío. Nada migra ni siembra solo. Opciones (manuales):
  restaurar un dump (`docker compose ... exec -T db pg_restore -U $DB_USER -d $DB_NAME --no-owner < dump`)
  o `docker compose ... --profile tools run --rm migrate` (alembic upgrade head).
- **n8n**: en el primer arranque importa `docker/n8n/workflows/*.json` y activa 3 crones (cola SAT cada 5 min,
  cancelaciones cada hora, estatus de REPs diario). `cron-sync-cancelled-invoices` queda inactivo (modifica datos).
  Crea tu usuario owner en http://localhost:5678. Para re-sembrar: borra `/home/node/.n8n/.seeded` en el volumen.
- Los endpoints que llama n8n no tienen autenticación en el backend; por eso el backend no se publica en prod.
