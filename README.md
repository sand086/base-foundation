### 2. Instalar dependencias

Puedes usar tu gestor de paquetes preferido (`npm` o `bun`):

**Bash**

```
# Usando NPM:
npm install

# O usando Bun (Recomendado por velocidad):
bun install
```

### 3. Configurar Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto para indicarle al Frontend dónde escuchar al Backend:

**Fragmento de código**

```
# URL de la API del Backend (FastAPI)
VITE_API_URL=http://localhost:8000
```

### 4. Iniciar el servidor de desarrollo

Levanta el entorno local de Vite:

**Bash**

```
# Usando NPM:
npm run dev

# O usando Bun:
bun dev
```

El proyecto se abrirá automáticamente en tu navegador en: [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)

### 5. Compilar para Producción

Para generar los archivos optimizados listos para desplegar en producción (HTML, JS, CSS estáticos):

**Bash**

```
# Usando NPM:
npm run build

# O usando Bun:
bun run build
```

Esto generará la carpeta `/dist`, lista para ser servida por Nginx, Netlify, Vercel o cualquier servidor estático.

## Estructura del Proyecto (`/src`)

La arquitectura sigue un patrón modular estructurado por características operativas ( **Features** ):

- `src/api/` -> Cliente HTTP Axios configurado (`axiosClient.ts`) y servicios autogenerados de la API.
- `src/components/` -> Componentes globales reutilizables (UI base, tablas, loaders, layouts de cabecera y sidebar).
- `src/context/` -> Contextos globales de React (`AuthContext.tsx` para sesión y `ThemeProvider.tsx` para modo oscuro/claro).
- `src/features/` -> Módulos de la aplicación encapsulados con sus propios hooks, tipos y componentes:
  - `maintenance/` -> Tablas y modales de Órdenes de Trabajo e Inventario de taller.
  - `fleet/` -> Control de unidades, operadores e historial/montaje de llantas.
  - `logistics/` -> Despacho, planeador de viajes y línea de tiempo (timeline).
  - `treasury/` / `payables` / `receivables` -> Flujos de caja, estados de cuenta, facturación SAT y complementos de pago.
- `src/pages/` -> Vistas completas de la aplicación (Dashboard, Login, Perfil, etc.) que orquestan los componentes de las _features_ .
  """

file_path = "/mnt/data/README_FRONTEND.md"
with open(file_path, "w", encoding="utf-8") as f:
f.write(markdown_content)