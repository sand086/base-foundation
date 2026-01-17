import { useState } from "react";
import { Search, Plus, AlertTriangle, Package, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { mockInventory, InventoryItem } from "@/data/mantenimientoData";
import { AddInventarioModal } from "./AddInventarioModal";
import { ViewInventarioModal } from "./ViewInventarioModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categories = ['Todos', 'Motor', 'Frenos', 'Eléctrico', 'Suspensión', 'Transmisión', 'General'];

export const InventarioTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToView, setItemToView] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "Todos" || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total SKUs</p>
                <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn(lowStockCount > 0 && "border-red-200 bg-red-50/50")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bajo Stock</p>
                <p className={cn("text-2xl font-bold", lowStockCount > 0 ? "text-red-600" : "text-slate-800")}>
                  {lowStockCount}
                </p>
              </div>
              <AlertTriangle className={cn("h-8 w-8", lowStockCount > 0 ? "text-red-500" : "text-slate-400")} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Inventario</p>
                <p className="text-2xl font-bold text-slate-800">
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar SKU o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ActionButton onClick={handleOpenNewModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Refacción
        </ActionButton>
      </div>

      {/* Table */}
      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-12">#</DataTableHead>
            <DataTableHead>SKU</DataTableHead>
            <DataTableHead className="min-w-[250px]">Descripción</DataTableHead>
            <DataTableHead>Categoría</DataTableHead>
            <DataTableHead className="text-center">Stock Actual</DataTableHead>
            <DataTableHead className="text-center">Stock Mínimo</DataTableHead>
            <DataTableHead>Ubicación</DataTableHead>
            <DataTableHead className="text-right">Precio Unit.</DataTableHead>
            <DataTableHead className="text-center">Acciones</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredInventory.map((item, index) => {
            const isLowStock = item.stockActual < item.stockMinimo;
            return (
              <DataTableRow 
                key={item.id}
                className={cn(isLowStock && "bg-red-50/50", "group")}
              >
                <DataTableCell>
                  <div className="flex items-center gap-2">
                    {isLowStock && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={cn(
                      "font-mono text-xs",
                      isLowStock ? "text-red-600 font-bold" : "text-slate-500"
                    )}>
                      {index + 1}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell className="font-mono text-xs font-medium text-slate-800">
                  {item.sku}
                </DataTableCell>
                <DataTableCell className="text-slate-700">
                  {item.descripcion}
                </DataTableCell>
                <DataTableCell>{getCategoryBadge(item.categoria)}</DataTableCell>
                <DataTableCell className="text-center">
                  <span className={cn(
                    "font-semibold",
                    isLowStock ? "text-red-600" : "text-slate-800"
                  )}>
                    {item.stockActual}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-center text-slate-500">
                  {item.stockMinimo}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {item.ubicacion}
                </DataTableCell>
                <DataTableCell className="text-right font-mono text-sm text-slate-700">
                  {formatCurrency(item.precioUnitario)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-slate-500 pt-2">
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
