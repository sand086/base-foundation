Write-Host " Iniciando unificación y sanación de módulos..." -ForegroundColor Cyan

$modulesPath = "app/modules"

if (!(Test-Path $modulesPath)) {
    Write-Host " No se encontró la carpeta app/modules. Ejecuta el script en la raíz de 'backend'." -ForegroundColor Red
    exit
}

$folders = Get-ChildItem -Path $modulesPath -Directory

foreach ($folder in $folders) {
    $path = $folder.FullName
    Write-Host " Procesando módulo: $($folder.Name)" -ForegroundColor Yellow

    # --- 1. PROCESAR CRUDs ---
    $crudFiles = Get-ChildItem -Path $path -Filter "crud_*.py"
    if ($crudFiles) {
        $targetFile = "$path/crud.py"
        New-Item -ItemType File -Path $targetFile -Force | Out-Null
        foreach ($file in $crudFiles) {
            $content = Get-Content $file.FullName -Raw
            # Sanar importación de esquema: de 'import schemas_xxx' a 'import schemas'
            $content = $content -replace "from . import schemas_\w+ as schemas", "from . import schemas"
            $content = $content -replace "from . import schemas_\w+", "from . import schemas"
            
            Add-Content -Path $targetFile -Value "`n# --- Fuente: $($file.Name) ---`n$content"
            Remove-Item $file.FullName
        }
        Write-Host "   CRUDs unificados en crud.py" -ForegroundColor Green
    }

    # --- 2. PROCESAR SCHEMAS ---
    $schemaFiles = Get-ChildItem -Path $path -Filter "schemas_*.py"
    if ($schemaFiles) {
        $targetFile = "$path/schemas.py"
        New-Item -ItemType File -Path $targetFile -Force | Out-Null
        foreach ($file in $schemaFiles) {
            $content = Get-Content $file.FullName -Raw
            Add-Content -Path $targetFile -Value "`n# --- Fuente: $($file.Name) ---`n$content"
            Remove-Item $file.FullName
        }
        Write-Host "   Schemas unificados en schemas.py" -ForegroundColor Green
    }

    # --- 3. PROCESAR APIs (ROUTERS) ---
    $apiFiles = Get-ChildItem -Path $path -Filter "api_*.py"
    if ($apiFiles) {
        $targetFile = "$path/router.py"
        New-Item -ItemType File -Path $targetFile -Force | Out-Null
        foreach ($file in $apiFiles) {
            $content = Get-Content $file.FullName -Raw
            # Sanar importaciones relativas de crud y schemas
            $content = $content -replace "from . import crud_\w+ as crud", "from . import crud"
            $content = $content -replace "from . import schemas_\w+ as schemas", "from . import schemas"
            $content = $content -replace "from app.crud import audit", "from app.modules.monitoring.crud_audit"
            
            Add-Content -Path $targetFile -Value "`n# --- Fuente: $($file.Name) ---`n$content"
            Remove-Item $file.FullName
        }
        Write-Host "  APIs unificadas en router.py" -ForegroundColor Green
    }
}

Write-Host " ¡Sanación completada! Ahora revisa tus archivos router.py para eliminar definiciones duplicadas de 'router = APIRouter()'." -ForegroundColor Cyan