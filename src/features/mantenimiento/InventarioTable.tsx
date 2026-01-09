import { useState } from "react";
import { Search, Plus, AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
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
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { mockInventory, InventoryItem } from "@/data/mantenimientoData";
import { cn } from "@/lib/utils";

const categories = ['Todos', 'Motor', 'Frenos', 'Eléctrico', 'Suspensión', 'Transmisión', 'General'];

export const InventarioTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [inventory] = useState<InventoryItem[]>(mockInventory);

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
        <ActionButton>
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
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredInventory.map((item, index) => {
            const isLowStock = item.stockActual < item.stockMinimo;
            return (
              <DataTableRow 
                key={item.id}
                className={cn(isLowStock && "bg-red-50/50")}
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
    </div>
  );
};
