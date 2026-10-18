# syntax=docker/dockerfile:1
# Backend FastAPI (TMS 3T). Un solo Dockerfile para dev y prod; el comando lo define cada compose.

# ---- Builder: compila ruedas (pycairo, lxml, etc.) con toolchain completo ----
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential pkg-config libcairo2-dev libffi-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install -r requirements.txt

# ---- Runtime: solo librerías compartidas (WeasyPrint/Pango, cairo, libpq) ----
FROM python:3.12-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 libgdk-pixbuf-2.0-0 \
        libffi8 libpq5 shared-mime-info fonts-liberation curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY . .
EXPOSE 8000
# Un solo worker a propósito: verificar_doble_clic() (api_billing.py) guarda su candado en memoria del proceso.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
