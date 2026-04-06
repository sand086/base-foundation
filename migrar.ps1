Write-Host " Iniciando la MigraciOn a Feature-Sliced Design (InglEs)..." -ForegroundColor Cyan

if (-not (Test-Path "src")) {
    Write-Host "No se encontrO la carpeta src. AsegUrate de estar en la raIz del proyecto." -ForegroundColor Red
    exit
}
Set-Location "src"

Write-Host " Creando carpetas de features..." -ForegroundColor Yellow
$domains = @("operators", "units", "tires", "maintenance", "inventory", "trips", "receivables", "payables", "settlements", "treasury", "clients", "users", "settings", "bulk-uploads", "dashboard", "notifications", "audit")

foreach ($domain in $domains) {
    New-Item -ItemType Directory -Force -Path "features\$domain\components" | Out-Null
    New-Item -ItemType Directory -Force -Path "features\$domain\hooks" | Out-Null
    New-Item -ItemType Directory -Force -Path "features\$domain\services" | Out-Null
    New-Item -ItemType File -Force -Path "features\$domain\types.ts" | Out-Null
}

New-Item -ItemType Directory -Force -Path "features\bulk-uploads\config" | Out-Null

Write-Host " Moviendo y renombrando componentes..." -ForegroundColor Yellow

# FunciOn para mover sin que marque errores si un archivo ya no existe
function Move-Safe {
    param($Source, $Destination)
    if (Test-Path $Source) {
        Move-Item -Path $Source -Destination $Destination -Force -ErrorAction SilentlyContinue
    }
}

# Operadores y Unidades
Move-Safe "features\flota\AddOperadorModal.tsx" "features\operators\components\AddOperatorModal.tsx"
Move-Safe "features\flota\OperadoresTable.tsx" "features\operators\components\OperatorsTable.tsx"
Move-Safe "features\flota\OperatorDetailSheet.tsx" "features\operators\components\OperatorDetailSheet.tsx"
Move-Safe "features\flota\AddUnidadModal.tsx" "features\units\components\AddUnitModal.tsx"
Move-Safe "features\flota\PatrimonialView.tsx" "features\units\components\PatrimonialView.tsx"
Move-Safe "features\flota\TruckChassisSVG.tsx" "features\units\components\TruckChassisSVG.tsx"
Move-Safe "features\flota\DocumentUploadManager.tsx" "components\common\DocumentUploadManager.tsx"

# Llantas
Move-Safe "features\llantas\AssignTireModal.tsx" "features\tires\components\AssignTireModal.tsx"
Move-Safe "features\llantas\CreateTireModal.tsx" "features\tires\components\CreateTireModal.tsx"
Move-Safe "features\llantas\MaintenanceTireModal.tsx" "features\tires\components\MaintenanceTireModal.tsx"
Move-Safe "features\llantas\MountTireModal.tsx" "features\tires\components\MountTireModal.tsx"
Move-Safe "features\llantas\TireHistorySheet.tsx" "features\tires\components\TireHistorySheet.tsx"
Move-Safe "features\llantas\types.ts" "features\tires\types.ts"

# Mantenimiento
Move-Safe "features\mantenimiento\WorkOrderModal.tsx" "features\maintenance\components\WorkOrderModal.tsx"
Move-Safe "features\mantenimiento\OrdenesTrabajoTable.tsx" "features\maintenance\components\WorkOrdersTable.tsx"
Move-Safe "features\mechanics\MechanicDetail.tsx" "features\maintenance\components\MechanicDetail.tsx"
Move-Safe "features\mechanics\MechanicDocuments.tsx" "features\maintenance\components\MechanicDocuments.tsx"
Move-Safe "features\mechanics\MechanicExpedienteModal.tsx" "features\maintenance\components\MechanicExpedienteModal.tsx"
Move-Safe "features\mechanics\MechanicFormModal.tsx" "features\maintenance\components\MechanicFormModal.tsx"
Move-Safe "features\mechanics\MechanicsTable.tsx" "features\maintenance\components\MechanicsTable.tsx"

# Inventario
Move-Safe "features\mantenimiento\AddInventarioModal.tsx" "features\inventory\components\AddInventoryModal.tsx"
Move-Safe "features\mantenimiento\InventarioTable.tsx" "features\inventory\components\InventoryTable.tsx"
Move-Safe "features\mantenimiento\ViewInventarioModal.tsx" "features\inventory\components\ViewInventoryModal.tsx"

# Despacho y Monitoreo (Trips)
Move-Safe "features\despacho\DespachoWizard.tsx" "features\trips\components\DispatchWizard.tsx"
Move-Safe "features\despacho\NextLegModal.tsx" "features\trips\components\NextLegModal.tsx"
Move-Safe "features\despacho\StandByTrips.tsx" "features\trips\components\StandByTrips.tsx"
Move-Safe "features\despacho\TripDetailsModal.tsx" "features\trips\components\TripDetailsModal.tsx"
Move-Safe "features\despacho\TripPlanner.tsx" "features\trips\components\TripPlanner.tsx"
Move-Safe "features\monitoreo\TripMapPlaceholder.tsx" "features\trips\components\TripMapPlaceholder.tsx"
Move-Safe "features\monitoreo\UpdateStatusModal.tsx" "features\trips\components\UpdateStatusModal.tsx"

# Cuentas por Cobrar (Receivables)
Move-Safe "features\cxc\AccountStatementModal.tsx" "features\receivables\components\AccountStatementModal.tsx"
Move-Safe "features\cxc\CreateInvoiceModal.tsx" "features\receivables\components\CreateInvoiceModal.tsx"
Move-Safe "features\cxc\ImportServicesModal.tsx" "features\receivables\components\ImportServicesModal.tsx"
Move-Safe "features\cxc\ImportXMLPagoModal.tsx" "features\receivables\components\ImportXMLPaymentModal.tsx"
Move-Safe "features\cxc\InvoiceDetailSheet.tsx" "features\receivables\components\InvoiceDetailSheet.tsx"
Move-Safe "features\cxc\RegisterPaymentModal.tsx" "features\receivables\components\RegisterPaymentModal.tsx"
Move-Safe "features\cxc\types.ts" "features\receivables\types.ts"

# Cuentas por Pagar (Payables)
Move-Safe "features\cxp\InvoiceDetailSheet.tsx" "features\payables\components\InvoiceDetailSheet.tsx"
Move-Safe "features\cxp\ManageCategoriesModal.tsx" "features\payables\components\ManageCategoriesModal.tsx"
Move-Safe "features\cxp\RegisterExpenseModal.tsx" "features\payables\components\RegisterExpenseModal.tsx"
Move-Safe "features\cxp\RegisterPaymentModal.tsx" "features\payables\components\RegisterPaymentModal.tsx"
Move-Safe "features\cxp\SupplierDetailSheet.tsx" "features\payables\components\SupplierDetailSheet.tsx"
Move-Safe "features\cxp\SupplierModal.tsx" "features\payables\components\SupplierModal.tsx"
Move-Safe "features\cxp\types.ts" "features\payables\types.ts"
Move-Safe "features\compras\CreateOrderWizard.tsx" "features\payables\components\PurchaseOrderWizard.tsx"
Move-Safe "features\compras\ReceiveOrderModal.tsx" "features\payables\components\ReceiveOrderModal.tsx"
Move-Safe "features\compras\data.ts" "features\payables\data.ts"
Move-Safe "features\compras\printOrderPDF.ts" "features\payables\printOrderPDF.ts"

# Cierre y Combustible
Move-Safe "features\cierre\SettlementReceiptModal.tsx" "features\settlements\components\SettlementReceiptModal.tsx"
Move-Safe "features\cierre\TripSettlementModal.tsx" "features\settlements\components\TripSettlementModal.tsx"
Move-Safe "features\combustible\AddTicketModal.tsx" "features\settlements\components\AddTicketModal.tsx"
Move-Safe "features\combustible\ConciliarViajeModal.tsx" "features\settlements\components\FuelConciliationModal.tsx"
Move-Safe "features\combustible\EditCargaModal.tsx" "features\settlements\components\EditFuelModal.tsx"
Move-Safe "features\combustible\ViewCargaModal.tsx" "features\settlements\components\ViewFuelModal.tsx"
Move-Safe "features\combustible\types.ts" "features\settlements\types.ts"

# TesorerIa
Move-Safe "features\tesoreria\MovementDetailModal.tsx" "features\treasury\components\MovementDetailModal.tsx"
Move-Safe "features\pagos\PaymentModal.tsx" "features\treasury\components\PaymentModal.tsx"
Move-Safe "features\tesoreria\types.ts" "features\treasury\types.ts"

# Tarifas
Move-Safe "features\tarifas\ArmadorRutas.tsx" "features\clients\components\RouteBuilder.tsx"
Move-Safe "features\tarifas\CatalogoCasetas.tsx" "features\clients\components\TollBoothCatalog.tsx"

# Usuarios
Move-Safe "features\usuarios\AddUserModal.tsx" "features\users\components\AddUserModal.tsx"
Move-Safe "features\usuarios\EditUserModal.tsx" "features\users\components\EditUserModal.tsx"
Move-Safe "features\permisos\CreatePermissionModal.tsx" "features\users\components\CreatePermissionModal.tsx"
Move-Safe "features\permisos\ManageModulesModal.tsx" "features\users\components\ManageModulesModal.tsx"
Move-Safe "components\usuarios\ImageUpload.tsx" "features\users\components\ImageUpload.tsx"
Move-Safe "components\usuarios\PasswordInput.tsx" "features\users\components\PasswordInput.tsx"

# Configuracion
Move-Safe "features\configuracion\AseguradorasConfig.tsx" "features\settings\components\InsurersConfig.tsx"
Move-Safe "features\configuracion\ConceptosPagoConfig.tsx" "features\settings\components\PaymentConceptsConfig.tsx"
Move-Safe "features\configuracion\GenericCatalogManager.tsx" "features\settings\components\GenericCatalogManager.tsx"
Move-Safe "features\configuracion\SatCatalogsConfig.tsx" "features\settings\components\SatCatalogsConfig.tsx"
Move-Safe "features\configuracion\SatLegalConfig.tsx" "features\settings\components\SatLegalConfig.tsx"
Move-Safe "features\configuracion\SatStampsConfig.tsx" "features\settings\components\SatStampsConfig.tsx"
Move-Safe "features\configuracion\TiposLicenciaConfig.tsx" "features\settings\components\LicenseTypesConfig.tsx"
Move-Safe "features\configuracion\TiposUnidadConfig.tsx" "features\settings\components\UnitTypesConfig.tsx"

# Cargas masivas
Move-Safe "features\cargas-masivas\BulkUploadDrawer.tsx" "features\bulk-uploads\components\BulkUploadDrawer.tsx"
Move-Safe "features\cargas-masivas\importTypeConfigs.ts" "features\bulk-uploads\config\importTypeConfigs.ts"
Move-Safe "features\cargas-masivas\validationUtils.ts" "features\bulk-uploads\config\validationUtils.ts"

# Dashboard & Audit
Move-Safe "features\dashboard\KPICards.tsx" "features\dashboard\components\KPICards.tsx"
Move-Safe "features\dashboard\OnTimeChart.tsx" "features\dashboard\components\OnTimeChart.tsx"
Move-Safe "features\dashboard\OperatorStatsCharts.tsx" "features\dashboard\components\OperatorStatsCharts.tsx"
Move-Safe "features\dashboard\RecentServicesTable.tsx" "features\dashboard\components\RecentServicesTable.tsx"
Move-Safe "features\dashboard\TopClientsChart.tsx" "features\dashboard\components\TopClientsChart.tsx"
Move-Safe "features\auditoria\AuditLogPanel.tsx" "features\audit\components\AuditLogPanel.tsx"

Write-Host " Moviendo Servicios..." -ForegroundColor Yellow
Move-Safe "services\operatorService.ts" "features\operators\services\"
Move-Safe "services\unitService.ts" "features\units\services\"
Move-Safe "services\fleetService.ts" "features\units\services\"
Move-Safe "services\tireService.ts" "features\tires\services\"
Move-Safe "services\maintenanceService.ts" "features\maintenance\services\"
Move-Safe "services\mechanicService.ts" "features\maintenance\services\"
Move-Safe "services\geoapifyService.ts" "features\trips\services\"
Move-Safe "services\receivableService.ts" "features\receivables\services\"
Move-Safe "services\supplierService.ts" "features\payables\services\"
Move-Safe "services\fuelService.ts" "features\settlements\services\"
Move-Safe "services\clientService.ts" "features\clients\services\"
Move-Safe "services\tollService.ts" "features\clients\services\"
Move-Safe "services\userService.ts" "features\users\services\"
Move-Safe "services\roleService.ts" "features\users\services\"
Move-Safe "services\adminService.ts" "features\users\services\"
Move-Safe "services\authService.ts" "features\users\services\"
Move-Safe "services\auditService.ts" "features\audit\services\"
Move-Safe "services\configService.ts" "features\settings\services\"
Move-Safe "services\catalogService.ts" "features\settings\services\"
Move-Safe "services\billingService.ts" "features\settings\services\"
Move-Safe "services\dashboardService.ts" "features\dashboard\services\"
Move-Safe "services\brandService.ts" "features\settings\services\"

Write-Host " Moviendo Hooks..." -ForegroundColor Yellow
Move-Safe "hooks\useOperators.ts" "features\operators\hooks\"
Move-Safe "hooks\useUnits.ts" "features\units\hooks\"
Move-Safe "hooks\useTires.ts" "features\tires\hooks\"
Move-Safe "hooks\useMaintenance.ts" "features\maintenance\hooks\"
Move-Safe "hooks\useTrips.tsx" "features\trips\hooks\useTrips.ts"
Move-Safe "hooks\useBilling.ts" "features\receivables\hooks\"
Move-Safe "hooks\useSuppliers.ts" "features\payables\hooks\"
Move-Safe "hooks\useBankAccounts.ts" "features\treasury\hooks\"
Move-Safe "hooks\useClients.ts" "features\clients\hooks\"
Move-Safe "hooks\useRutasAutorizadas.ts" "features\clients\hooks\useAuthorizedRoutes.ts"
Move-Safe "hooks\useUsers.ts" "features\users\hooks\"
Move-Safe "hooks\useRoles.ts" "features\users\hooks\"
Move-Safe "hooks\useAdminActions.ts" "features\users\hooks\"
Move-Safe "hooks\useSystemConfig.ts" "features\settings\hooks\"
Move-Safe "hooks\useSatCatalogs.ts" "features\settings\hooks\"
Move-Safe "hooks\useInsurers.ts" "features\settings\hooks\"
Move-Safe "hooks\useLicenseTypes.ts" "features\settings\hooks\"
Move-Safe "hooks\useTiposUnidad.ts" "features\settings\hooks\useUnitTypes.ts"
Move-Safe "hooks\useSettlementConcepts.ts" "features\settings\hooks\"
Move-Safe "hooks\useDashboard.ts" "features\dashboard\hooks\"
Move-Safe "hooks\useSecurityNotifications.ts" "features\notifications\hooks\"
Move-Safe "hooks\useAuditLogs.ts" "features\audit\hooks\"

Write-Host " Limpiando carpetas basura..." -ForegroundColor Yellow
$oldDirs = @("components\usuarios", "features\flota", "features\llantas", "features\mantenimiento", "features\mechanics", "features\despacho", "features\monitoreo", "features\cxc", "features\cxp", "features\compras", "features\cierre", "features\combustible", "features\tesoreria", "features\pagos", "features\tarifas", "features\usuarios", "features\permisos", "features\configuracion", "features\cargas-masivas", "features\auditoria", "services")
foreach ($dir in $oldDirs) {
    if (Test-Path $dir) { Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue }
}
if (Test-Path "components\ProtectedRoute.tsx") { Remove-Item "components\ProtectedRoute.tsx" -Force -ErrorAction SilentlyContinue }

Write-Host " MIGRACION COMPLETADA CON EXITO." -ForegroundColor Green