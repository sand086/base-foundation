import { useState, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  Package,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  Database,
  DollarSign,
  CheckCircle,
  PackageX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

// IMPORTANTE: Usar el Hook y Tipo real
import { useMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { InventoryItem } from "@/features/inventory/types";

import { AddInventoryModal } from "@/features/inventory/components/AddInventoryModal";
import { ViewInventoryModal } from "@/features/inventory/components/ViewInventoryModal";
import { cn } from "@/lib/utils";

const categories = [
  "Motor",
  "Frenos",
  "Eléctrico",
  "Suspensión",
  "Transmisión",
  "General",
];

export const InventoryTable = () => {
  // 1. Hook de datos
  const { inventory, isLoading, createItem, deleteItem, updateItem } =
    useMaintenance();

  // 2. Estados locales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToView, setItemToView] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // 3. Formateador de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // 4. Cálculos de KPIs Optimizados
  const kpis = useMemo(() => {
    const items = inventory || [];
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      const stock = item.stock_actual || 0;
      const minStock = item.stock_minimo || 0;
      const price = item.precio_unitario || 0;

      totalValue += stock * price;

      if (stock === 0) {
        outOfStockCount += 1;
      } else if (stock <= minStock) {
        lowStockCount += 1;
      }
    });

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      outOfStockCount,
      isHealthy: lowStockCount === 0 && outOfStockCount === 0,
    };
  }, [inventory]);

  // 5. Renderizado de Categorías
  const getCategoryBadge = (categoria: string) => {
    const categoryName = categoria
      ? categoria.charAt(0).toUpperCase() + categoria.slice(1)
      : "General";

    const colorClasses: Record<string, string> = {
      Motor:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
      Frenos:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
      Eléctrico:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
      Suspensión:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-500/30",
      Transmisión:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
      General:
        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
    };

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border-none",
          colorClasses[categoryName] || colorClasses.General,
        )}
      >
        {categoryName}
      </Badge>
    );
  };

  // 6. Manejadores de acciones
  const handleSave = async (itemData: any) => {
    let success = false;
    if (itemToEdit) {
      success = await updateItem(itemToEdit.id, itemData);
    } else {
      success = await createItem(itemData);
    }

    if (success) {
      setIsAddModalOpen(false);
      setItemToEdit(null);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteItem(itemToDelete);
    setItemToDelete(null);
  };

  const handleEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsAddModalOpen(true);
  };

  const handleView = (item: InventoryItem) => {
    setItemToView(item);
    setIsViewModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setItemToEdit(null);
    setIsAddModalOpen(true);
  };

  // 7. Definición de Columnas
  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      {
        key: "sku",
        header: "SKU",
        sortable: true,
        render: (value, item) => {
          const isLowStock = item.stock_actual <= item.stock_minimo;
          const isOutOfStock = item.stock_actual === 0;
          return (
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <PackageX className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              ) : isLowStock ? (
                <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 animate-pulse" />
              ) : null}
              <span className="font-mono font-black text-brand-navy dark:text-white uppercase tracking-tight bg-slate-100 dark:bg-white/5 px-2 py-1 rounded border border-slate-200 dark:border-white/5">
                {value}
              </span>
            </div>
          );
        },
      },
      {
        key: "descripcion",
        header: "Descripción",
        sortable: true,
        width: "min-w-[250px]",
        render: (value) => (
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {value}
          </span>
        ),
      },
      {
        key: "categoria",
        header: "Categoría",
        type: "status",
        statusOptions: categories,
        sortable: true,
        render: (value) => getCategoryBadge(value as string),
      },
      {
        key: "stock_actual",
        header: "Stock Actual",
        type: "number",
        sortable: true,
        render: (value, item) => {
          const isOutOfStock = item.stock_actual === 0;
          const isLowStock =
            item.stock_actual <= item.stock_minimo && !isOutOfStock;
          return (
            <span
              className={cn(
                "font-mono font-black text-sm text-center block",
                isOutOfStock
                  ? "text-rose-600 dark:text-rose-500"
                  : isLowStock
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {value}
            </span>
          );
        },
      },
      {
        key: "stock_minimo",
        header: "Stock Mínimo",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono font-bold text-xs text-slate-400 dark:text-slate-500 text-center block">
            {value}
          </span>
        ),
      },
      {
        key: "proveedor_nombre",
        header: "Proveedor",
        sortable: true,
        render: (value) => (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {value || "Sin Proveedor"}
          </span>
        ),
      },
      {
        key: "ubicacion",
        header: "Ubicación",
        sortable: true,
        render: (value) => (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {value || "N/A"}
          </span>
        ),
      },
      {
        key: "precio_unitario",
        header: "Precio Unit.",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300 text-right block">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        width: "w-[60px]",
        render: (_, item) => (
          <div
            className="flex justify-end pr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
              >
                <DropdownMenuItem
                  onClick={() => handleView(item)}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => handleEdit(item)}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Edit className="h-4 w-4 text-brand-green" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                  onClick={() => setItemToDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  // Pantalla de Carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-brand-red" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
            Cargando inventario...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* SECCIÓN DE KPIS (4 Tarjetas Ordenadas y Responsivas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total SKUs */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
              Total de SKUs
            </CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono tracking-tighter text-brand-navy dark:text-white">
              {kpis.totalItems}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
              Artículos registrados
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database className="h-24 w-24 text-blue-500" />
          </div>
        </Card>

        {/* KPI 2: Valor del Inventario */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
              Valor Inventario
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tighter text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpis.totalValue)}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
              Capital almacenado
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package className="h-24 w-24 text-emerald-500" />
          </div>
        </Card>

        {/* KPI 3: Alertas de Stock (Bajo mínimo) */}
        <Card
          className={cn(
            "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all relative overflow-hidden group",
            kpis.lowStockCount > 0
              ? "border-amber-200 dark:border-amber-900/50"
              : "border-slate-200/60 dark:border-white/10",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
              {kpis.isHealthy ? "Stock Saludable" : "Alerta de Stock"}
            </CardTitle>
            {kpis.isHealthy ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-black font-mono tracking-tighter",
                kpis.lowStockCount > 0
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-emerald-600 dark:text-emerald-500",
              )}
            >
              {kpis.lowStockCount}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
              Próximos a agotarse
            </p>
          </CardContent>
          {kpis.lowStockCount > 0 && (
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-amber-500 animate-pulse" />
            </div>
          )}
        </Card>

        {/* KPI 4: Stock Agotado */}
        <Card
          className={cn(
            "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all relative overflow-hidden group",
            kpis.outOfStockCount > 0
              ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-900/10"
              : "border-slate-200/60 dark:border-white/10",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
              Stock Agotado
            </CardTitle>
            <PackageX
              className={cn(
                "h-4 w-4",
                kpis.outOfStockCount > 0 ? "text-rose-500" : "text-slate-400",
              )}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-black font-mono tracking-tighter",
                kpis.outOfStockCount > 0
                  ? "text-rose-600 dark:text-rose-500"
                  : "text-slate-700 dark:text-slate-300",
              )}
            >
              {kpis.outOfStockCount}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
              Requieren reabastecimiento
            </p>
          </CardContent>
          {kpis.outOfStockCount > 0 && (
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <PackageX className="h-24 w-24 text-rose-500" />
            </div>
          )}
        </Card>
      </div>

      {/* TABLA PRINCIPAL (Liquid Glass Tahoe) */}
      <Card
        variant="default"
        className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden"
      >
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6 gap-4">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <Database className="h-6 w-6 text-brand-red" /> Catálogo de
            Refacciones
          </CardTitle>
          <Button
            variant="default"
            size="lg"
            onClick={handleOpenNewModal}
            className="w-full sm:w-auto haptic-press shadow-lg shadow-brand-red/20 bg-brand-red hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Refacción
          </Button>
        </CardHeader>

        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          <EnhancedDataTable
            data={inventory}
            columns={columns}
            exportFileName="inventario-refacciones"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/* MODALES */}
      <AddInventoryModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setItemToEdit(null);
        }}
        itemToEdit={itemToEdit as any}
        onSave={handleSave}
      />

      <ViewInventoryModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        item={itemToView as any}
      />

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  Eliminar Refacción
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible • Catálogo Inventario
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea eliminar la refacción del inventario
                permanentemente?
              </p>

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Configuración y Costos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción eliminará la refacción del catálogo activo y no
                  podrá ser seleccionada en futuras Órdenes de Trabajo.{" "}
                  <b className="font-black underline">
                    Esta acción no se puede deshacer
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar Refacción
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
