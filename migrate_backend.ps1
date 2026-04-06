# init_fsd_architecture.ps1
Write-Host " Iniciando la creacion de la Arquitectura Modular (FSD) para el Backend..." -ForegroundColor Cyan

$basePath = "app"
$modulesPath = "$basePath/modules"
$integrationsPath = "$basePath/integrations"

# 1. Definicion de los Dominios de Negocio (Basado en tus endpoints actuales)
$domains = @(
    "auth",          # auth.py, users.py
    "catalogs",      # catalogs.py, brands.py, terminals.py
    "clients",       # clients.py
    "dashboard",     # dashboard.py
    "finance",       # finance.py, receivables.py
    "fleet",         # units.py, operators.py, tires.py, fuel.py
    "logistics",     # trips.py, tolls.py
    "maintenance",   # maintenance.py
    "monitoring",    # operations.py, notifications.py
    "suppliers"      # suppliers.py
)

# 2. Definicion de Integraciones Externas
$integrations = @(
    "sat",           # billing.py, catalogs_sat.py, billing_service.py
    "email",         # email_service.py
    "storage"        # storage.py
)

# Crear Integraciones
Write-Host " Construyendo carpeta de Integraciones..." -ForegroundColor Yellow
if (!(Test-Path $integrationsPath)) { New-Item -ItemType Directory -Force -Path $integrationsPath | Out-Null }

foreach ($int in $integrations) {
    $path = "$integrationsPath/$int"
    if (!(Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
    New-Item -ItemType File -Force -Path "$path/__init__.py" | Out-Null
}

# Crear Modulos (Dominios)
Write-Host " Construyendo Dominios de Negocio (Modulos)..." -ForegroundColor Yellow
if (!(Test-Path $modulesPath)) { New-Item -ItemType Directory -Force -Path $modulesPath | Out-Null }

foreach ($domain in $domains) {
    $path = "$modulesPath/$domain"
    if (!(Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
    
    # Crear los archivos base de cada dominio
    $files = @("__init__.py", "router.py", "crud.py", "schemas.py")
    foreach ($file in $files) {
        $filePath = "$path/$file"
        if (!(Test-Path $filePath)) {
            New-Item -ItemType File -Force -Path $filePath | Out-Null
        }
    }
}

Write-Host " Estructura FSD creada exitosamente. Listo para iniciar la migracion." -ForegroundColor Green
Write-Host " Siguiente paso: Mover la logica de api/, crud/ y schemas/ hacia modules/" -ForegroundColor Magenta