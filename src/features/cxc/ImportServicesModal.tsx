import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from '@/components/ui/data-table';
import { Search, FileInput, Truck } from 'lucide-react';
import { FinalizableService } from './types';

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
  const [search, setSearch] = useState('');

  const availableServices = services.filter(s => !s.facturado);
  
  const filteredServices = availableServices.filter(s =>
    s.cliente.toLowerCase().includes(search.toLowerCase()) ||
    s.ruta.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
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
      setSelectedIds(new Set(filteredServices.map(s => s.id)));
    }
  };

  const selectedServices = availableServices.filter(s => selectedIds.has(s.id));
  const totalMonto = selectedServices.reduce((sum, s) => sum + s.monto, 0);

  const handleImport = () => {
    onImport(selectedServices);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <FileInput className="h-5 w-5" />
            Importar Servicios Finalizados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, ruta o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Services Table */}
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center bg-muted/30 rounded-lg border border-dashed">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay servicios finalizados sin facturar</p>
            </div>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredServices.length && filteredServices.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </DataTableHead>
                  <DataTableHead>ID Servicio</DataTableHead>
                  <DataTableHead>Cliente</DataTableHead>
                  <DataTableHead>Ruta</DataTableHead>
                  <DataTableHead>Entrega</DataTableHead>
                  <DataTableHead className="text-right">Monto</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {filteredServices.map((service) => (
                  <DataTableRow 
                    key={service.id}
                    className={selectedIds.has(service.id) ? 'bg-brand-navy/5' : ''}
                  >
                    <DataTableCell>
                      <Checkbox
                        checked={selectedIds.has(service.id)}
                        onCheckedChange={() => handleToggle(service.id)}
                      />
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs font-medium">
                      {service.id}
                    </DataTableCell>
                    <DataTableCell className="font-medium">
                      {service.cliente}
                    </DataTableCell>
                    <DataTableCell className="text-sm">
                      {service.ruta}
                    </DataTableCell>
                    <DataTableCell className="text-sm text-muted-foreground">
                      {service.fechaEntrega}
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      ${service.monto.toLocaleString('es-MX')}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}

          {/* Summary */}
          {selectedIds.size > 0 && (
            <div className="p-4 bg-brand-navy/5 rounded-lg border border-brand-navy/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Servicios seleccionados</p>
                  <p className="font-semibold text-brand-dark">{selectedIds.size} servicio(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total a facturar</p>
                  <p className="text-xl font-bold text-brand-green">
                    ${totalMonto.toLocaleString('es-MX')} MXN
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0}
            className="bg-brand-green hover:bg-brand-green/90 text-white"
          >
            Importar y Crear Factura ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
