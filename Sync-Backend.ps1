# ==============================================================================
#  SCRIPT DE SINCRONIZACIÓN Y REESTRUCTURACIÓN DE TIPOS DEL BACKEND
# ==============================================================================

$FeaturesPath = "src/features"
# Cambia esta ruta o URL si tu OpenAPI se sirve desde otro lado (ej: http://localhost:8000/openapi.json)
$OpenApiInput = "./openapi.json" 
$ApiOutput = "./src/api/generated"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " 1. GENERANDO CÓDIGO DE LA API" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

# Ejecuta el generador de openapi-typescript-codegen usando npx y axios
try {
    Write-Host "Leyendo esquema desde: $OpenApiInput" -ForegroundColor Gray
    npx openapi-typescript-codegen --input $OpenApiInput --output $ApiOutput --client axios
    Write-Host "[OK] Código generado exitosamente en $ApiOutput`n" -ForegroundColor Green
} catch {
    Write-Host "[X] Error al generar el código de la API. Revisa tu openapi.json o el servidor backend." -ForegroundColor Red
    exit
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " 2. REESTRUCTURANDO TIPOS DE FEATURES" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Test-Path $FeaturesPath)) {
    Write-Host "[!] No se encontró la ruta $FeaturesPath. Abortando reestructuración." -ForegroundColor Red
    exit
}

# Obtener todas las subcarpetas de features
$Folders = Get-ChildItem -Path $FeaturesPath -Directory

foreach ($Folder in $Folders) {
    $CurrentPath = $Folder.FullName
    $OriginalTypes = Join-Path $CurrentPath "types.ts"
    $BackupTypes = Join-Path $CurrentPath "types_2.ts"
    $GeneratedTypes = Join-Path $CurrentPath "types.generated.ts"

    Write-Host " Procesando: $($Folder.Name)" -ForegroundColor Yellow

    # 1. Renombrar el original a types_2.ts (Respaldo manual)
    if (Test-Path $OriginalTypes) {
        if (-not (Test-Path $BackupTypes)) {
            Rename-Item -Path $OriginalTypes -NewName "types_2.ts"
            Write-Host "  [OK] Tipos manuales respaldados -> types_2.ts" -ForegroundColor Green
        } else {
            Write-Host "  [!] types_2.ts ya existe, manteniendo el respaldo original." -ForegroundColor Gray
        }
    }

    # 2. Renombrar el generado a types.ts (Nuevo estándar del backend)
    if (Test-Path $GeneratedTypes) {
        if (-not (Test-Path $OriginalTypes)) {
            Rename-Item -Path $GeneratedTypes -NewName "types.ts"
            Write-Host "  [OK] Tipos del backend listos -> types.ts" -ForegroundColor Green
        } else {
            Write-Host "  [!] Ocurrió un conflicto: types.ts aún existe. Revisa manualmente." -ForegroundColor Red
        }
    } else {
        Write-Host "  [-] No hay types.generated.ts en esta feature." -ForegroundColor Gray
    }
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  ¡SINCRONIZACIÓN FINALIZADA CON ÉXITO!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan