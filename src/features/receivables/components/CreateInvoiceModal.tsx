import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, FileText, DollarSign, Loader2 } from "lucide-react";
import { ReceivableInvoice, InvoiceConcept, FinalizableService } from "./types";
//  1. Eliminamos el mock e importamos el hook real y el tipo
import { useClients } from "@/features/clients/hooks/useClients";
import { Client } from "@/types/api.types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    invoice: Omit<ReceivableInvoice, "id" | "folio" | "cobros" | "estatus">,
  ) => void;
  importedServices?: FinalizableService[];
}

const creditDaysOptions = [
  { value: 0, label: "Contado" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
  { value: 45, label: "45 días" },
  { value: 60, label: "60 días" },
];

export function CreateInvoiceModal({
  open,
  onOpenChange,
  onSubmit,
  importedServices,
}: CreateInvoiceModalProps) {
  //  2. Consumimos clientes reales
  const { clients, isLoading: loadingClients } = useClients();

  const [clienteId, setClienteId] = useState("");
  const [diasCredito, setDiasCredito] = useState(30);
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [conceptos, setConceptos] = useState<InvoiceConcept[]>([]);

  //  3. Buscar el cliente seleccionado en la lista real
  const selectedClient = useMemo(
    () => clients.find((c) => c.id.toString() === clienteId),
    [clients, clienteId],
  );

  useEffect(() => {
    if (importedServices && importedServices.length > 0 && open) {
      setClienteId(importedServices[0].clienteId.toString());

      const newConceptos: InvoiceConcept[] = importedServices.map(
        (srv, idx) => ({
          id: `IMP-${idx}`,
          descripcion: `Servicio de transporte: ${srv.ruta} (${srv.tipoUnidad})`,
          cantidad: 1,
          precioUnitario: srv.monto,
          importe: srv.monto,
        }),
      );

      setConceptos(newConceptos);
    } else if (open && !importedServices) {
      setClienteId("");
      setConceptos([
        {
          id: "1",
          descripcion: "",
          cantidad: 1,
          precioUnitario: 0,
          importe: 0,
        },
      ]);
    }
  }, [importedServices, open]);

  const fechaVencimiento = (() => {
    const date = new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date.toISOString().split("T")[0];
  })();

  const montoTotal = conceptos.reduce((sum, c) => sum + c.importe, 0);

  const addConcepto = () => {
    setConceptos([
      ...conceptos,
      {
        id: String(Date.now()),
        descripcion: "",
        cantidad: 1,
        precioUnitario: 0,
        importe: 0,
      },
    ]);
  };

  const removeConcepto = (id: string) => {
    if (conceptos.length > 1) {
      setConceptos(conceptos.filter((c) => c.id !== id));
    }
  };

  const updateConcepto = (
    id: string,
    field: keyof InvoiceConcept,
    value: string | number,
  ) => {
    setConceptos(
      conceptos.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === "cantidad" || field === "precioUnitario") {
            updated.importe =
              Number(updated.cantidad) * Number(updated.precioUnitario);
          }
          return updated;
        }
        return c;
      }),
    );
  };

  const handleSubmit = () => {
    if (!clienteId || conceptos.length === 0 || montoTotal <= 0) return;

    onSubmit({
      clienteId,
      cliente: selectedClient?.razon_social || "", //  Corregido nombre de campo
      clienteRfc: selectedClient?.rfc || "",
      conceptos,
      montoTotal,
      saldoPendiente: montoTotal,
      moneda,
      fechaEmision,
      fechaVencimiento,
      diasCredito,
      serviciosRelacionados: importedServices?.map((s) => s.id) || [],
      requiereREP: false,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <FileText className="h-5 w-5" />
            {importedServices ? "Facturar Servicios" : "Nueva Factura Manual"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cliente <span className="text-status-danger">*</span>
              </Label>
              <Select
                value={clienteId}
                onValueChange={setClienteId}
                disabled={loadingClients}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingClients
                        ? "Cargando clientes..."
                        : "Seleccionar cliente"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {/*  4. Iteramos sobre los clientes reales del backend */}
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                RFC
              </Label>
              <Input
                value={selectedClient?.rfc || ""}
                disabled
                className="bg-muted font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fecha Emisión
              </Label>
              <Input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Términos (Días)
              </Label>
              <Select
                value={String(diasCredito)}
                onValueChange={(v) => setDiasCredito(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {creditDaysOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Moneda
              </Label>
              <Select
                value={moneda}
                onValueChange={(v: "MXN" | "USD") => setMoneda(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-md border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Vencimiento calculado:
            </span>
            <span className="font-semibold text-brand-dark">
              {fechaVencimiento}
            </span>
          </div>

          {/* Conceptos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Conceptos de Facturación
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConcepto}
                className="gap-1 h-7 text-[11px]"
              >
                <Plus className="h-3 w-3" />
                Añadir Concepto
              </Button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {conceptos.map((concepto) => (
                <div
                  key={concepto.id}
                  className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/30 rounded border group hover:border-brand-navy/30 transition-colors"
                >
                  <div className="col-span-6">
                    <Input
                      placeholder="Descripción"
                      value={concepto.descripcion}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "descripcion",
                          e.target.value,
                        )
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={concepto.cantidad}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "cantidad",
                          Number(e.target.value),
                        )
                      }
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={concepto.precioUnitario}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "precioUnitario",
                          Number(e.target.value),
                        )
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-1 text-right text-xs font-bold">
                    ${concepto.importe.toLocaleString("es-MX")}
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConcepto(concepto.id)}
                      disabled={conceptos.length === 1}
                      className="h-7 w-7 text-muted-foreground hover:text-status-danger"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-brand-dark rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-brand-green" />
                <span className="font-medium">Monto Total</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">
                  ${montoTotal.toLocaleString("es-MX")}
                </span>
                <span className="ml-2 text-xs opacity-70">{moneda}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clienteId || montoTotal <= 0 || loadingClients}
            className="bg-brand-green hover:bg-brand-green/90 text-white min-w-[140px]"
          >
            {loadingClients ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirmar y Crear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
