import { useState, useMemo } from "react";
import { Plus, AlertTriangle, Package, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
import { EnhancedDataTable, ColumnDef } from "@/components/ui/enhanced-data-table";
import { mockInventory, InventoryItem } from "@/data/mantenimientoData";
import { AddInventarioModal } from "./AddInventarioModal";
import { ViewInventarioModal } from "./ViewInventarioModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categories = ['Motor', 'Frenos', 'Eléctrico', 'Suspensión', 'Transmisión', 'General'];

export const InventarioTable = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToView, setItemToView] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const lowStockCount = inventory.filter(
    (item) => item.stockActual < item.stockMinimo
  ).length;

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
      Suspensión: "bg-purple-100 text-purple-700 border-purple-200",
      Transmisión: "bg-orange-100 text-orange-700 border-orange-200",
      General: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <Badge className={cn("hover:bg-opacity-100", colors[categoria] || colors.General)}>
        {categoria}
      </Badge>
    );
  };

  // CRUD handlers
  const handleSave = (itemData: Omit<InventoryItem, 'id'> & { id?: string }) => {
    if (itemToEdit) {
      setInventory(prev => prev.map(item => 
        item.id === itemToEdit.id ? { ...item, ...itemData } as InventoryItem : item
      ));
    } else {
      const newItem: InventoryItem = {
        ...itemData,
        id: `inv-${Date.now()}`,
      } as InventoryItem;
      setInventory(prev => [...prev, newItem]);
    }
    setItemToEdit(null);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    const item = inventory.find(i => i.id === itemToDelete);
    setInventory(prev => prev.filter(i => i.id !== itemToDelete));
    toast.success('Refacción eliminada', {
      description: `${item?.sku} ha sido eliminada del inventario.`,
    });
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

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<InventoryItem>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (value, item) => {
        const isLowStock = item.stockActual < item.stockMinimo;
        return (
          <div className="flex items-center gap-2">
            {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className="font-mono text-xs font-medium text-foreground">{value}</span>
          </div>
        );
      },
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      sortable: true,
      width: 'min-w-[250px]',
      render: (value) => (
        <span className="text-foreground">{value}</span>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      type: 'status',
      statusOptions: categories,
      sortable: true,
      render: (value) => getCategoryBadge(value),
    },
    {
      key: 'stockActual',
      header: 'Stock Actual',
      type: 'number',
      sortable: true,
      render: (value, item) => {
        const isLowStock = item.stockActual < item.stockMinimo;
        return (
          <span className={cn(
            "font-semibold text-center block",
            isLowStock ? "text-red-600" : "text-foreground"
          )}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'stockMinimo',
      header: 'Stock Mínimo',
      type: 'number',
      sortable: true,
      render: (value) => (
        <span className="text-muted-foreground text-center block">{value}</span>
      ),
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      sortable: true,
      render: (value) => (
        <span className="text-muted-foreground">{value}</span>
      ),
    },
    {
      key: 'precioUnitario',
      header: 'Precio Unit.',
      type: 'number',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm text-foreground text-right block">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      sortable: false,
      width: 'w-[80px]',
      render: (_, item) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem className="gap-2" onClick={() => handleView(item)}>
                <Eye className="h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => handleEdit(item)}>
                <Edit className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => setItemToDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn(lowStockCount > 0 && "border-red-200 bg-red-50/50")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajo Stock</p>
                <p className={cn("text-2xl font-bold", lowStockCount > 0 ? "text-red-600" : "text-foreground")}>
                  {lowStockCount}
                </p>
              </div>
              <AlertTriangle className={cn("h-8 w-8", lowStockCount > 0 ? "text-red-500" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Inventario</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(
                    inventory.reduce(
                      (sum, item) => sum + item.stockActual * item.precioUnitario,
                      0
                    )
                  )}
                </p>
              </div>
              <Package className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Button */}
      <div className="flex justify-end">
        <ActionButton onClick={handleOpenNewModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Refacción
        </ActionButton>
      </div>

      {/* EnhancedDataTable */}
      <EnhancedDataTable
        data={inventory}
        columns={columns}
        exportFileName="inventario-refacciones"
      />

      {/* Legend */}
      <div className="flex gap-6 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span>Stock por debajo del mínimo - Requiere reorden</span>
        </div>
      </div>

      {/* Modals */}
      <AddInventarioModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        onSave={handleSave}
      />

      <ViewInventarioModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        item={itemToView}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la refacción{' '}
              <span className="font-semibold">
                {inventory.find(i => i.id === itemToDelete)?.sku}
              </span>
              ? Esta acción no se puede deshacer.
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
