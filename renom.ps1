# SCRIPT DE MIGRACIoN AUTOMATIZADA DE TIPOS (TMS)
$GeneratedModels = "src/api/generated/models"
$FeaturesPath = "src/features"

# Definicion de mapeos (Prefijo del archivo -> Carpeta en Features)
$Mappings = @{
    "Unit"        = "units"
    "Operator"    = "operators"
    "Client"      = "clients"
    "Fuel"        = "settlements"
    "Supplier"    = "suppliers"
    "Tire"        = "tires"
    "Trip"        = "trips"
    "Inventory"   = "inventory"
    "Mechanic"    = "maintenance"
    "WorkOrder"   = "maintenance"
    "Role"        = "users"
    "User"        = "users"
    "Login"       = "users"
    "Payable"     = "payables"
    "Receivable"  = "receivables"
    "Dashboard"   = "dashboard"
}

Write-Host "--- Iniciando Migracion de Tipos ---" -ForegroundColor Cyan

foreach ($Mapping in $Mappings.GetEnumerator()) {
    $Prefix = $Mapping.Name
    $TargetFolder = $Mapping.Value
    $TargetFile = "$FeaturesPath/$TargetFolder/types.generated.ts"
    
    # Buscar archivos que coincidan con el prefijo
    $MatchingFiles = Get-ChildItem "$GeneratedModels/$Prefix*.ts" -ErrorAction SilentlyContinue

    if ($MatchingFiles) {
        Write-Host " Procesando modulo: $TargetFolder ($($MatchingFiles.Count) archivos)" -ForegroundColor Yellow
        
        # Crear encabezado
        $Content = "/**  ARCHIVO GENERADO AUTOMaTICAMENTE - NO EDITAR DIRECTAMENTE **/" + "`n"
        $Content += "/** Copia lo que necesites a types.ts **/ `n`n"

        foreach ($File in $MatchingFiles) {
            $Lines = Get-Content $File.FullName
            foreach ($Line in $Lines) {
                # Omitir lineas de importacion que apuntan al core generado
                if ($Line -notmatch "import .* from") {
                    $Content += $Line + "`n"
                }
            }
            $Content += "`n"
        }

        # Guardar en la carpeta de la feature
        $Content | Out-File -FilePath $TargetFile -Encoding utf8
        Write-Host " Creado: $TargetFile" -ForegroundColor Green
    }
}

Write-Host "--- Proceso Finalizado ---" -ForegroundColor Cyan
Write-Host "Revisa los archivos 'types.generated.ts' en cada carpeta de feature."