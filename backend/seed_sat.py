import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Importar los modelos
from app.models.models import SatProduct, SatLocationCode

# ==========================================
# 1. CONEXIÓN SEGURA USANDO TU LÓGICA (.env)
# ==========================================
load_dotenv()

user = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "password")
server = os.getenv("DB_SERVER", "localhost")
port = os.getenv("DB_PORT", "5432")
db_name = os.getenv(
    "DB_NAME", "tms_db1"
)  # <- Asume tms_db1 por defecto si no está en el env

encoded_user = quote_plus(user)
encoded_password = quote_plus(password)

SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{encoded_user}:{encoded_password}@{server}:{port}/{db_name}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ==========================================
# 2. FUNCIÓN DE SEMBRADO
# ==========================================
def seed_sat_catalogs():
    db = SessionLocal()

    print(f"--> INFO: Conectado a '{server}/{db_name}' para sembrado")
    print("🚀 Iniciando sembrado del Catálogo SAT...")

    # 1. PRODUCTOS EXACTOS DE TUS PDFs + LOS MÁS COMUNES
    productos_base = [
        {
            "clave": "50131801",
            "descripcion": "Queso natural",
            "es_material_peligroso": "0",
        },
        {
            "clave": "53141606",
            "descripcion": "Bobinas o sujeta bobinas",
            "es_material_peligroso": "0",
        },
        {
            "clave": "20121445",
            "descripcion": "Accesorios y partes",
            "es_material_peligroso": "0",
        },
        {
            "clave": "47121600",
            "descripcion": "Máquinas hidrolavadoras y equipo de limpieza",
            "es_material_peligroso": "0",
        },
        {
            "clave": "12161800",
            "descripcion": "Materiales corrosivos (Acidos/Alcalinos)",
            "es_material_peligroso": "1",
        },
        {
            "clave": "78101802",
            "descripcion": "Flete Carga General",
            "es_material_peligroso": "0",
        },
        {
            "clave": "24112700",
            "descripcion": "Contenedores de carga o de embalaje",
            "es_material_peligroso": "0",
        },
    ]

    for prod in productos_base:
        existe = db.query(SatProduct).filter(SatProduct.clave == prod["clave"]).first()
        if not existe:
            nuevo_prod = SatProduct(**prod)
            db.add(nuevo_prod)
            print(f"✅ Producto agregado: {prod['clave']} - {prod['descripcion']}")

    # 2. UBICACIONES EXACTAS DE TUS PDFs
    ubicaciones_base = [
        # La base de Veracruz (Contenedores y Asociados)
        {
            "codigo_postal": "91700",
            "estado_clave": "VER",
            "municipio_clave": "193",
            "localidad_clave": "17",
        },
        # Renacimiento, Veracruz (Dirección de RÁPIDOS 3T)
        {
            "codigo_postal": "91808",
            "estado_clave": "VER",
            "municipio_clave": "193",
            "localidad_clave": "",
        },
        # Tepotzotlán (Kuehne + Nagel)
        {
            "codigo_postal": "54710",
            "estado_clave": "MEX",
            "municipio_clave": "121",
            "localidad_clave": "",
        },
        # Cuautitlán (International de México)
        {
            "codigo_postal": "54879",
            "estado_clave": "MEX",
            "municipio_clave": "024",
            "localidad_clave": "",
        },
        # CDMX (Cremeria San Jose)
        {
            "codigo_postal": "09040",
            "estado_clave": "CMX",
            "municipio_clave": "007",
            "localidad_clave": "",
        },
    ]

    for loc in ubicaciones_base:
        existe = (
            db.query(SatLocationCode)
            .filter(SatLocationCode.codigo_postal == loc["codigo_postal"])
            .first()
        )
        if not existe:
            nueva_loc = SatLocationCode(**loc)
            db.add(nueva_loc)
            print(
                f"📍 Ubicación agregada: CP {loc['codigo_postal']} ({loc['estado_clave']})"
            )

    db.commit()
    db.close()
    print("🎉 ¡Sembrado de Catálogos SAT completado con éxito!")


if __name__ == "__main__":
    seed_sat_catalogs()
