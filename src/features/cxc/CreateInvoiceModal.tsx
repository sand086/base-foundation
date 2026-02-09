import { useState, useEffect } from "react";
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
import { Plus, Trash2, FileText, DollarSign } from "lucide-react";
import { ReceivableInvoice, InvoiceConcept, FinalizableService } from "./types";
import { mockClients } from "@/data/mockData";

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
  const [clienteId, setClienteId] = useState("");
  const [diasCredito, setDiasCredito] = useState(30);
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [conceptos, setConceptos] = useState<InvoiceConcept[]>([]);

  // Initialize with imported services
  useEffect(() => {
    if (importedServices && importedServices.length > 0 && open) {
      // Set client from first service
      setClienteId(importedServices[0].clienteId);

      // Create concepts from services
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
      // Reset for manual creation
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

  const selectedClient = mockClients.find((c) => c.id === clienteId);

  // Calculate due date
  const fechaVencimiento = (() => {
    const date = new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date.toISOString().split("T")[0];
  })();

  // Calculate total
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
          // Recalculate importe
          if (field === "cantidad" || field === "precioUnitario") {
            updated.importe = updated.cantidad * updated.precioUnitario;
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
      cliente: selectedClient?.razónSocial || "",
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
          {/* Client Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Client <span className="text-status-danger">*</span>
              </Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {mockClients
                    .filter((c) => c.estatus === "activo")
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.razónSocial}
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
                className="bg-muted"
              />
            </div>
          </div>

          {/* Dates and Terms */}
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
                Días de Crédito
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

          {/* Due Date Preview */}
          <div className="p-3 bg-muted/50 rounded-md border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Fecha de Vencimiento (calculada):
              </span>
              <span className="font-semibold text-brand-dark">
                {fechaVencimiento}
              </span>
            </div>
          </div>

          {/* Conceptos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Conceptos
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConcepto}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {conceptos.map((concepto, idx) => (
                <div
                  key={concepto.id}
                  className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/30 rounded border"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="Descripción del concepto"
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
                      placeholder="Cant."
                      value={concepto.cantidad || ""}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "cantidad",
                          Number(e.target.value),
                        )
                      }
                      className="h-8 text-sm text-center"
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Precio"
                      value={concepto.precioUnitario || ""}
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
                  <div className="col-span-2 text-right">
                    <span className="font-medium text-sm">
                      ${concepto.importe.toLocaleString("es-MX")}
                    </span>
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

          {/* Total */}
          <div className="p-4 bg-brand-navy/5 rounded-lg border border-brand-navy/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-brand-green" />
                <span className="font-medium">Total a Facturar</span>
              </div>
              <span className="text-2xl font-bold text-brand-green">
                ${montoTotal.toLocaleString("es-MX")} {moneda}
              </span>
            </div>
          </div>

          {/* Imported Services Info */}
          {importedServices && importedServices.length > 0 && (
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
              <p className="text-sm text-emerald-700">
                ✓ Esta factura incluye {importedServices.length} servicio(s)
                importados: {importedServices.map((s) => s.id).join(", ")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clienteId || montoTotal <= 0}
            className="bg-brand-green hover:bg-brand-green/90 text-white"
          >
            Crear Factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
