# Backend - TMS Rápidos 3T

API y lógica de negocio para el sistema de gestión de transporte (TMS). Construido con **FastAPI**, **SQLAlchemy** (PostgreSQL) y generación de documentos PDF/SAT.

## Requisitos Previos

- **Python 3.10+** instalado en tu sistema.
- **PostgreSQL** instalado y en ejecución.
- _(Opcional)_ Dependencias del sistema para `WeasyPrint` (GTK3, Pango, etc.) si vas a generar PDFs de la Carta Porte localmente.

---

## Guía de Instalación y Ejecución

### 1. Entrar al directorio

Si no estás en la carpeta del backend, ingresa a ella:

```bash
cd backend
```

### 2. Crear y activar el entorno virtual

Es una buena práctica encapsular las dependencias de Python:

**Bash**

```
python -m venv venv

# Activar en Linux/Mac:
source venv/bin/activate

# Activar en Windows (CMD / PowerShell):
venv\Scripts\activate
```

### 3. Instalar dependencias

Instala todas las librerías necesarias (FastAPI, SQLAlchemy, WeasyPrint, etc.):

**Bash**

```
pip install -r requirements.txt
```

_(Nota: Si `uvicorn` no se instaló con las dependencias base, instálalo con `pip install uvicorn`)_ .

### 4. Crear base de datos PostgreSQL

Crea la base de datos vacía donde vivirán las tablas del sistema:

**Bash**

```
createdb tms_db
```

### 5. Configurar Variables de Entorno

Crea un archivo llamado `.env` en la raíz de la carpeta `backend`. Puedes basarte en un `.env.example` si existe. Añade tu configuración de conexión:

**Fragmento de código**

```
# Ejemplo de configuración en .env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/tms_db
# Aquí también puedes agregar tus JWT_SECRET_KEY, Accesos del SAT, etc.
```

### 6. Ejecutar Migraciones (Alembic)

Antes de insertar datos, necesitas crear las tablas en la base de datos ejecutando las migraciones:

**Bash**

```
alembic upgrade head
```

### 7. Ejecutar Seed (Poblado de Base de Datos)

Ejecuta el script para llenar la base de datos con los catálogos iniciales, configuraciones del sistema o el usuario administrador por defecto:

**Bash**

```
python seed.py
```

### 8. Iniciar el Servidor

Levanta el servidor de desarrollo usando Uvicorn. _(Nota: como el archivo `main.py` se encuentra dentro del módulo `app`, usamos `app.main:app`)_ :

**Bash**

```
uvicorn app.main:app --reload --port 8000
```

## Documentación de la API

Una vez que el servidor esté en ejecución, puedes explorar y probar todos los endpoints generados interactivamente a través de Swagger UI en la siguiente ruta:

[http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)
