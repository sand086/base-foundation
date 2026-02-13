from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Cargar variables del archivo .env
load_dotenv()

# 1. Obtener piezas individuales (Más seguro que leer la URL completa)
user = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "password")
server = os.getenv("DB_SERVER", "localhost")
port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "tms_db")

print(f"--> INFO: Conectando usuario '{user}' a '{server}/{db_name}'")

# 2. SANITIZACIÓN (La clave para evitar el error Unicode)
# Esto limpia cualquier caracter basura en el usuario o contraseña
encoded_user = quote_plus(user)
encoded_password = quote_plus(password)

# 3. Construir la URL manualmente
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{encoded_user}:{encoded_password}@{server}:{port}/{db_name}"
)

# 4. Crear el motor
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    # Prueba de conexión rápida para fallar temprano si hay error
    with engine.connect() as connection:
        print("--> ÉXITO: Conexión a Base de Datos establecida.")
except Exception as e:
    print(f"--> ERROR FATAL DB: {e}")
    # Imprimir la longitud para ver si hay caracteres fantasma
    print(f"--> Longitud cadena conexión: {len(SQLALCHEMY_DATABASE_URL)}")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
