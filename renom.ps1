# renombrar_paginas.ps1
$pagesDir = "src\pages"

$renames = @{
    "CargasMasivas.tsx" = "BulkUploads.tsx"
    "MonitoringCenter.tsx" = "MonitoringCenter.tsx"
    "TripSettlement.tsx" = "TripSettlement.tsx"
    "ClientsCatalog.tsx" = "ClientsCatalog.tsx"
    "ClientForm.tsx" = "ClientForm.tsx"
    "FuelLoads.tsx" = "FuelLoads.tsx"
    "FuelConciliation.tsx" = "FuelConciliation.tsx"
    "Purchases.tsx" = "Purchases.tsx"
    "TrafficControl.tsx" = "TrafficControl.tsx"
    "Receivables.tsx" = "Receivables.tsx"
    "Dispatch.tsx" = "Dispatch.tsx"
    "FinanceDashboard.tsx" = "FinanceDashboard.tsx"
    "FleetTires.tsx" = "FleetTires.tsx"
    "FleetOperators.tsx" = "FleetOperators.tsx"
    "FleetUnitDetail.tsx" = "FleetUnitDetail.tsx"
    "FleetUnits.tsx" = "FleetUnits.tsx"
    "RateManagement.tsx" = "RateManagement.tsx"
    "Maintenance.tsx" = "Maintenance.tsx"
    "Mechanics.tsx" = "Mechanics.tsx"
    "NotificationsConfig.tsx" = "NotificationsConfig.tsx"
    "Payables.tsx" = "Payables.tsx"
    "RolesPermissions.tsx" = "RolesPermissions.tsx"
    "Treasury.tsx" = "Treasury.tsx"
    "Users.tsx" = "Users.tsx"
}

Write-Host "Iniciando renombrado de paginas..." -ForegroundColor Cyan

foreach ($old in $renames.Keys) {
    $new = $renames[$old]
    $oldPath = Join-Path $pagesDir $old
    
    if (Test-Path $oldPath) {
        Rename-Item -Path $oldPath -NewName $new
        Write-Host " EXITOSO: $old -> $new" -ForegroundColor Green
    } else {
        Write-Host " IGNORADO: $old no se encontro (quizas ya fue renombrado)" -ForegroundColor Yellow
    }
}

Write-Host "Renombrado completado." -ForegroundColor Cyan