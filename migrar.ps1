# Script de Reestructuración Financiera FSD
# Creado para mover el código de 'payables' a módulos especializados
Write-Host "Iniciando reestructuración FSD..." -ForegroundColor Cyan

$featuresPath = ".\src\features"
$payablesPath = "$featuresPath\payables"

# 1. DEFINICIÓN DE NUEVAS CARPETAS
$newFeatures = @("suppliers", "purchases", "billing")

# Crear estructura base para cada nueva feature
foreach ($feature in $newFeatures) {
    $featureDir = "$featuresPath\$feature"
    if (!(Test-Path -Path $featureDir)) {
        New-Item -ItemType Directory -Force -Path "$featureDir\components" | Out-Null
        New-Item -ItemType Directory -Force -Path "$featureDir\hooks" | Out-Null
        New-Item -ItemType Directory -Force -Path "$featureDir\services" | Out-Null
        
        # Crear archivo types.ts vacío pero listo
        New-Item -ItemType File -Force -Path "$featureDir\types.ts" | Out-Null
        Add-Content -Path "$featureDir\types.ts" -Value "// Types para $feature"
        
        Write-Host "Creada estructura para: $feature" -ForegroundColor Green
    }
}

# Asegurar que el archivo types.ts existe en treasury
if (!(Test-Path -Path "$featuresPath\treasury\types.ts")) {
    New-Item -ItemType File -Force -Path "$featuresPath\treasury\types.ts" | Out-Null
    Add-Content -Path "$featuresPath\treasury\types.ts" -Value "// Types para Tesorería"
}

# 2. MOVER COMPONENTES Y ARCHIVOS DESDE PAYABLES

Write-Host "`nMoviendo archivos desde Payables..." -ForegroundColor Yellow

# --- A Suppliers (Proveedores) ---
$filesToSuppliers = @(
    "components\SupplierDetailSheet.tsx",
    "components\SupplierModal.tsx",
    "components\ManageCategoriesModal.tsx",
    "hooks\useSuppliers.ts",
    "services\supplierService.ts"
)

foreach ($file in $filesToSuppliers) {
    $source = "$payablesPath\$file"
    $dest = "$featuresPath\suppliers\$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "  -> Movido: $file a suppliers"
    }
}

# --- A Purchases (Compras Operativas) ---
$filesToPurchases = @(
    "components\PurchaseOrderWizard.tsx",
    "components\ReceiveOrderModal.tsx",
    "printOrderPDF.ts"
)

foreach ($file in $filesToPurchases) {
    $source = "$payablesPath\$file"
    # El PDF print script lo ponemos en utils o services de purchases
    if ($file -eq "printOrderPDF.ts") {
        $dest = "$featuresPath\purchases\services\printOrderPDF.ts"
    } else {
        $dest = "$featuresPath\purchases\$file"
    }
    
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "  -> Movido: $file a purchases"
    }
}

# --- A Treasury (Tesorería) ---
# Veo que tienes componentes de pago mezclados en payables y receivables. 
# Los moveremos a treasury para centralizar.
$filesToTreasury = @(
    "components\RegisterPaymentModal.tsx"
)

foreach ($file in $filesToTreasury) {
    # Mover de payables
    $sourcePayables = "$payablesPath\$file"
    $destTreasury = "$featuresPath\treasury\$file"
    
    if (Test-Path $sourcePayables) {
        Move-Item -Path $sourcePayables -Destination $destTreasury -Force
        Write-Host "  -> Movido: $file (desde payables) a treasury"
    }

    # Si hay uno igual en receivables, lo borramos o renombramos porque ahora tesorería manda.
    $sourceReceivables = "$featuresPath\receivables\$file"
    if (Test-Path $sourceReceivables) {
        # Como no queremos sobreescribir destructivamente, le ponemos un sufijo si existe
        if (Test-Path $destTreasury) {
            Rename-Item -Path $sourceReceivables -NewName "ClientRegisterPaymentModal.tsx" -Force
            Move-Item -Path "$featuresPath\receivables\components\ClientRegisterPaymentModal.tsx" -Destination "$featuresPath\treasury\components\" -Force
            Write-Host "  -> Movido y renombrado: RegisterPaymentModal de receivables a treasury"
        } else {
            Move-Item -Path $sourceReceivables -Destination $destTreasury -Force
        }
    }
}

Write-Host "`n¡Reestructuración base completada!" -ForegroundColor Cyan
Write-Host "IMPORTANTE: Ahora debes entrar a los archivos movidos y usar VS Code (Ctrl + Shift + F) para buscar y reemplazar las rutas de importación. Ejemplo:" -ForegroundColor Yellow
Write-Host "  Buscar: '@/features/payables/types'"
Write-Host "  Reemplazar según aplique por: '@/features/suppliers/types' o '@/features/purchases/types'"