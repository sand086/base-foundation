`# 1. Crear directorio y entrar
mkdir backend && cd backend

# 2. Crear entorno virtual

python -m venv venv
source venv/bin/activate # Linux/Mac

# venv\Scripts\activate # Windows

# 3. Instalar dependencias

pip install -r requirements.txt

# 4. Crear base de datos PostgreSQL

createdb tms_db

# 5. Configurar .env con tu password

# DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/tms_db

# 6. Ejecutar seed

python seed.py

# 7. Iniciar servidor

uvicorn main:app --reload --port 8000
`
