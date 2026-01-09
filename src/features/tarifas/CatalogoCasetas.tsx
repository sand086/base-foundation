import { useState } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { mockTollBooths, TollBooth } from "@/data/tarifasData";

export const CatalogoCasetas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths] = useState<TollBooth[]>(mockTollBooths);

  const filteredTolls = tollBooths.filter(
    (toll) =>
      toll.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toll.tramo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getFormaPagoBadge = (formaPago: string) => {
    switch (formaPago) {
      case "TAG":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
            TAG
          </Badge>
        );
      case "Efectivo":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            Efectivo
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
            Ambos
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar caseta o tramo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ActionButton>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caseta
        </ActionButton>
      </div>

      {/* Table */}
      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>Nombre Caseta</DataTableHead>
            <DataTableHead>Tramo</DataTableHead>
            <DataTableHead className="text-center" colSpan={2}>
              5 Ejes
            </DataTableHead>
            <DataTableHead className="text-center" colSpan={2}>
              9 Ejes
            </DataTableHead>
            <DataTableHead>Forma de Pago</DataTableHead>
            <DataTableHead className="text-right">Acciones</DataTableHead>
          </DataTableRow>
          <DataTableRow className="bg-slate-50/50">
            <DataTableHead></DataTableHead>
            <DataTableHead></DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Sencillo
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Full
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Sencillo
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Full
            </DataTableHead>
            <DataTableHead></DataTableHead>
            <DataTableHead></DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredTolls.map((toll) => (
            <DataTableRow key={toll.id}>
              <DataTableCell className="font-medium text-slate-900">
                {toll.nombre}
              </DataTableCell>
              <DataTableCell className="text-slate-600">
                {toll.tramo}
              </DataTableCell>
              <DataTableCell className="text-slate-700 font-mono text-xs">
                {formatCurrency(toll.costo5EjesSencillo)}
              </DataTableCell>
              <DataTableCell className="text-emerald-700 font-mono text-xs font-semibold bg-emerald-50/50">
                {formatCurrency(toll.costo5EjesFull)}
              </DataTableCell>
              <DataTableCell className="text-slate-700 font-mono text-xs">
                {formatCurrency(toll.costo9EjesSencillo)}
              </DataTableCell>
              <DataTableCell className="text-emerald-700 font-mono text-xs font-semibold bg-emerald-50/50">
                {formatCurrency(toll.costo9EjesFull)}
              </DataTableCell>
              <DataTableCell>{getFormaPagoBadge(toll.formaPago)}</DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <button className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
                    <Edit className="h-4 w-4 text-slate-500" />
                  </button>
                  <button className="p-1.5 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-slate-500 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-100 rounded"></div>
          <span>Sencillo = Ida</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-100 rounded"></div>
          <span>Full = Ida y Vuelta (Redondo)</span>
        </div>
      </div>
    </div>
  );
};
