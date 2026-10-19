# syntax=docker/dockerfile:1
# Frontend (Vite + React). Targets: "dev" (vite con HMR) y "prod" (build estático servido por nginx).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: el código fuente se monta como volumen desde el compose ----
FROM deps AS dev
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

# ---- build: las VITE_* se incrustan en el bundle, por eso son build args ----
FROM deps AS build
ARG VITE_API_BASE_URL=/api
ARG VITE_BACKEND_URL=
ARG VITE_GOOGLE_RECAPTCHA_V3_SITE_KEY=
ARG VITE_GEOAPIFY_API_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_GOOGLE_RECAPTCHA_V3_SITE_KEY=$VITE_GOOGLE_RECAPTCHA_V3_SITE_KEY \
    VITE_GEOAPIFY_API_KEY=$VITE_GEOAPIFY_API_KEY
COPY . .
RUN npm run build

# ---- prod ----
FROM nginx:1.27-alpine AS prod
# La imagen nginx aplica envsubst a /etc/nginx/templates/*.template al arrancar (solo a variables definidas).
ENV BACKEND_UPSTREAM=backend:8000
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
