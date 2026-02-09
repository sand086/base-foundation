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
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { useMaintenance } from "@/hooks/useMaintenance";
import { InventoryItem } from "@/services/maintenanceService";

import { AddInventarioModal } from "./AddInventarioModal";
import { ViewInventarioModal } from "./ViewInventarioModal";
import { cn } from "@/lib/utils";

const categories = [
  "Motor",
  "Frenos",
  "Eléctrico",
  "Suspensión",
  "Transmisión",
  "General",
];

export const InventarioTable = () => {
  // 1. Usar Hook Real
  const { inventory, isLoading, createItem, deleteItem } = useMaintenance();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToView, setItemToView] = useState<InventoryItem | null>(null);

  // itemToDelete ahora es number
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Calcular KPIs con propiedades reales (snake_case)
  const lowStockCount = inventory.filter(
    (item) => item.stock_actual < item.stock_minimo,
  ).length;

  const totalValue = inventory.reduce(
    (sum, item) => sum + item.stock_actual * item.precio_unitario,
    0,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getCategoryBadge = (categoria: string) => {
    const colors: Record<string, string> = {
      Motor: "bg-blue-100 text-blue-700 border-blue-200",
      Frenos: "bg-red-100 text-red-700 border-red-200",
      Eléctrico: "bg-yellow-100 text-yellow-700 border-yellow-200",
      General: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <Badge
        className={cn(
          "hover:bg-opacity-100",
          colors[categoria] || colors.General,
        )}
      >
        {categoria}
      </Badge>
    );
  };

  // Handlers conectados al hook
  const handleSave = async (itemData: any) => {
    // Nota: El modal debe enviar datos compatibles.
    // Si es edición (no implementado en backend aun), o creación:
    if (!itemToEdit) {
      await createItem(itemData);
    }
    setIsAddModalOpen(false);
    setItemToEdit(null);
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

  // Definir Columnas (Usando claves snake_case)
  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      {
        key: "sku",
        header: "SKU",
        sortable: true,
        render: (value, item) => {
          const isLowStock = item.stock_actual < item.stock_minimo;
          return (
            <div className="flex items-center gap-2">
              {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
              <span className="font-mono text-xs font-medium text-foreground">
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
        key: "stock_actual", // snake_case
        header: "Stock Actual",
        type: "number",
        sortable: true,
        render: (value, item) => {
          const isLowStock = item.stock_actual < item.stock_minimo;
          return (
            <span
              className={cn(
                "font-semibold text-center block",
                isLowStock ? "text-red-600" : "text-foreground",
              )}
            >
              {value}
            </span>
          );
        },
      },
      {
        key: "stock_minimo", // snake_case
        header: "Stock Mínimo",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="text-muted-foreground text-center block">
            {value}
          </span>
        ),
      },
      {
        key: "ubicacion",
        header: "Ubicación",
        sortable: true,
        render: (value) => (
          <span className="text-muted-foreground">{value}</span>
        ),
      },
      {
        key: "precio_unitario", // snake_case
        header: "Precio Unit.",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm text-foreground text-right block">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        width: "w-[80px]",
        render: (_, item) => (
          <div
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(item)}>
                  <Eye className="h-4 w-4 mr-2" /> Ver detalles
                </DropdownMenuItem>
                {/* Edición pendiente de conectar
              <DropdownMenuItem onClick={() => handleEdit(item)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setItemToDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold text-foreground">
                  {inventory.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(lowStockCount > 0 && "border-red-200 bg-red-50/50")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajo Stock</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    lowStockCount > 0 ? "text-red-600" : "text-foreground",
                  )}
                >
                  {lowStockCount}
                </p>
              </div>
              <AlertTriangle
                className={cn(
                  "h-8 w-8",
                  lowStockCount > 0 ? "text-red-500" : "text-muted-foreground",
                )}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Valor Inventario
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <Package className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <ActionButton onClick={handleOpenNewModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Refacción
        </ActionButton>
      </div>

      {/* Table */}
      <EnhancedDataTable
        data={inventory}
        columns={columns}
        exportFileName="inventario-refacciones"
      />

      {/* Modals */}
      {/* Nota: AddInventarioModal y ViewInventarioModal necesitarán ajustes menores para snake_case también */}
      <AddInventarioModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setItemToEdit(null);
        }}
        itemToEdit={itemToEdit as any} // Cast temporal
        onSave={handleSave}
      />

      <ViewInventarioModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        item={itemToView as any}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar esta refacción?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
