Write-Host " Iniciando migracion de archivos a Arquitectura Modular (FSD)..." -ForegroundColor Cyan

$basePath = "app"
if (!(Test-Path "$basePath/api")) {
    Write-Host " Error: Debes ejecutar este script dentro de la carpeta 'backend'" -ForegroundColor Red
    exit
}

$modulesPath = "$basePath/modules"
$integrationsPath = "$basePath/integrations"

# Crear carpetas base
New-Item -ItemType Directory -Force -Path $modulesPath | Out-Null
New-Item -ItemType Directory -Force -Path $integrationsPath | Out-Null

# 1. Mapa de Dominios (Modulos de negocio)
$domainMap = @{
    "auth" = @("auth", "users")
    "catalogs" = @("catalogs", "brands", "terminals")
    "clients" = @("clients")
    "dashboard" = @("dashboard")
    "finance" = @("finance", "receivables")
    "fleet" = @("units", "operators", "tires", "fuel")
    "logistics" = @("trips", "tolls")
    "maintenance" = @("maintenance")
    "monitoring" = @("operations", "notifications", "audit")
    "suppliers" = @("suppliers")
}

# Mover archivos a Modulos
foreach ($domain in $domainMap.Keys) {
    $domainDir = "$modulesPath/$domain"
    New-Item -ItemType Directory -Force -Path $domainDir | Out-Null
    New-Item -ItemType File -Force -Path "$domainDir/__init__.py" | Out-Null

    foreach ($file in $domainMap[$domain]) {
        if (Test-Path "$basePath/api/endpoints/$file.py") {
            Move-Item -Path "$basePath/api/endpoints/$file.py" -Destination "$domainDir/api_$file.py" -Force
            Write-Host " Movido: api/endpoints/$file.py -> modules/$domain/api_$file.py" -ForegroundColor Green
        }
        if (Test-Path "$basePath/crud/$file.py") {
            Move-Item -Path "$basePath/crud/$file.py" -Destination "$domainDir/crud_$file.py" -Force
            Write-Host " Movido: crud/$file.py -> modules/$domain/crud_$file.py" -ForegroundColor Green
        }
        if (Test-Path "$basePath/schemas/$file.py") {
            Move-Item -Path "$basePath/schemas/$file.py" -Destination "$domainDir/schemas_$file.py" -Force
            Write-Host " Movido: schemas/$file.py -> modules/$domain/schemas_$file.py" -ForegroundColor Green
        }
    }
}

# 2. Mapa de Integraciones Externas
Write-Host " Moviendo Integraciones (SAT, Email, Storage)..." -ForegroundColor Yellow

# SAT
New-Item -ItemType Directory -Force -Path "$integrationsPath/sat" | Out-Null
New-Item -ItemType File -Force -Path "$integrationsPath/sat/__init__.py" | Out-Null
if (Test-Path "$basePath/api/endpoints/billing.py") { Move-Item -Path "$basePath/api/endpoints/billing.py" -Destination "$integrationsPath/sat/api_billing.py" -Force }
if (Test-Path "$basePath/api/endpoints/catalogs_sat.py") { Move-Item -Path "$basePath/api/endpoints/catalogs_sat.py" -Destination "$integrationsPath/sat/api_catalogs_sat.py" -Force }
if (Test-Path "$basePath/services/billing_service.py") { Move-Item -Path "$basePath/services/billing_service.py" -Destination "$integrationsPath/sat/billing_service.py" -Force }

# Email & Storage
New-Item -ItemType Directory -Force -Path "$integrationsPath/email" | Out-Null
New-Item -ItemType File -Force -Path "$integrationsPath/email/__init__.py" | Out-Null
if (Test-Path "$basePath/services/email_service.py") { Move-Item -Path "$basePath/services/email_service.py" -Destination "$integrationsPath/email/email_service.py" -Force }

New-Item -ItemType Directory -Force -Path "$integrationsPath/storage" | Out-Null
New-Item -ItemType File -Force -Path "$integrationsPath/storage/__init__.py" | Out-Null
if (Test-Path "$basePath/services/storage.py") { Move-Item -Path "$basePath/services/storage.py" -Destination "$integrationsPath/storage/storage.py" -Force }

Write-Host " ¡Migracion de carpetas completada con éxito!" -ForegroundColor Cyan