import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Search, FileInput, Truck } from "lucide-react";
import { FinalizableService } from "@/features/receivables/types";

interface ImportServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: FinalizableService[];
  onImport: (selectedServices: FinalizableService[]) => void;
}

export function ImportServicesModal({
  open,
  onOpenChange,
  services,
  onImport,
}: ImportServicesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const availableServices = services.filter((s) => !s.facturado);

  const filteredServices = availableServices.filter(
    (s) =>
      s.cliente.toLowerCase().includes(search.toLowerCase()) ||
      s.ruta.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServices.map((s) => s.id)));
    }
  };

  const selectedServices = availableServices.filter((s) =>
    selectedIds.has(s.id),
  );
  const totalMonto = selectedServices.reduce((sum, s) => sum + s.monto, 0);

  const handleImport = () => {
    onImport(selectedServices);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <FileInput className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Importar Servicios
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Servicios Finalizados Sin Facturar
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, ruta o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Services Table */}
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card shadow-sm">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-tight">
                No hay servicios finalizados sin facturar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl bg-card shadow-sm">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedIds.size === filteredServices.length &&
                          filteredServices.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </DataTableHead>
                    <DataTableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Servicio</DataTableHead>
                    <DataTableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</DataTableHead>
                    <DataTableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ruta</DataTableHead>
                    <DataTableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entrega</DataTableHead>
                    <DataTableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredServices.map((service) => (
                    <DataTableRow
                      key={service.id}
                      className={
                        selectedIds.has(service.id) ? "bg-primary/5" : ""
                      }
                    >
                      <DataTableCell>
                        <Checkbox
                          checked={selectedIds.has(service.id)}
                          onCheckedChange={() => handleToggle(service.id)}
                        />
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs font-bold uppercase tracking-widest">
                        {service.id}
                      </DataTableCell>
                      <DataTableCell className="font-bold uppercase text-sm">
                        {service.cliente}
                      </DataTableCell>
                      <DataTableCell className="text-sm text-foreground">
                        {service.ruta}
                      </DataTableCell>
                      <DataTableCell className="text-sm text-muted-foreground font-mono">
                        {service.fechaEntrega}
                      </DataTableCell>
                      <DataTableCell className="text-right font-mono font-bold tracking-widest">
                        ${service.monto.toLocaleString("es-MX")}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          )}

          {/* Summary */}
          {selectedIds.size > 0 && (
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Servicios seleccionados
                  </p>
                  <p className="font-black text-foreground text-lg">
                    {selectedIds.size} servicio(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Total a facturar
                  </p>
                  <p className="text-xl font-black font-mono text-brand-green tracking-tighter">
                    ${totalMonto.toLocaleString("es-MX")} MXN
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CAPA 5: FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedIds.size === 0}
              className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              Importar y Crear Factura ({selectedIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
