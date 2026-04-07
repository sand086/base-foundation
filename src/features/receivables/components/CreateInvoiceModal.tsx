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
import { cn } from "@/lib/utils";

// 🚀 IMPORTACIONES FSD
import {
  ReceivableInvoice,
  FinalizableService,
  InvoiceConcept, // Definido en tus types de receivables
} from "@/features/receivables/types";
import { useClients } from "@/features/clients/hooks/useClients";

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    invoice: Omit<
      ReceivableInvoice,
      "id" | "folio_interno" | "payments" | "estatus"
    >,
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
  // 1. Consumimos clientes reales del backend
  const { clients, isLoading: loadingClients } = useClients();

  // Estados del formulario
  const [clienteId, setClienteId] = useState("");
  const [diasCredito, setDiasCredito] = useState(30);
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [conceptos, setConceptos] = useState<InvoiceConcept[]>([]);

  // 2. Buscar el cliente seleccionado para mostrar su RFC y datos
  const selectedClient = useMemo(
    () => clients.find((c) => c.id.toString() === clienteId),
    [clients, clienteId],
  );

  // 3. Efecto para manejar la importación de servicios desde el dashboard
  useEffect(() => {
    if (open) {
      if (importedServices && importedServices.length > 0) {
        // Auto-seleccionar cliente del primer servicio (asumiendo que son del mismo cliente)
        setClienteId(importedServices[0].clienteId.toString());

        const newConceptos: InvoiceConcept[] = importedServices.map(
          (srv, idx) => ({
            id: `IMP-${idx}-${Date.now()}`,
            descripcion: `Servicio de transporte: ${srv.ruta} (${srv.tipoUnidad})`,
            cantidad: 1,
            precioUnitario: srv.monto,
            importe: srv.monto,
          }),
        );
        setConceptos(newConceptos);
      } else {
        // Inicializar vacío si es creación manual
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
    }
  }, [importedServices, open]);

  // Cálculos automáticos
  const fechaVencimiento = useMemo(() => {
    const date = new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date.toISOString().split("T")[0];
  }, [fechaEmision, diasCredito]);

  const montoTotal = useMemo(
    () => conceptos.reduce((sum, c) => sum + c.importe, 0),
    [conceptos],
  );

  // Manejo de Conceptos
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
      client_id: Number(clienteId), // Tu tipo espera 'number'
      cliente: selectedClient?.razon_social || "",
      cliente_rfc: selectedClient?.rfc || "",
      conceptos,
      monto_total: montoTotal, // Coincidir con 'monto_total' de la interfaz
      saldo_pendiente: montoTotal, // Coincidir con 'saldo_pendiente'
      moneda,
      fecha_emision: fechaEmision, // Coincidir con 'fecha_emision'
      fecha_vencimiento: fechaVencimiento, // Coincidir con 'fecha_vencimiento'
      dias_credito: diasCredito, // Si añades este a la interfaz (opcional)
      servicios_relacionados: importedServices?.map((s) => s.id) || [],
      requiere_rep: false, // Coincidir con 'requiere_rep'
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-6 bg-muted/50 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground text-xl font-black uppercase tracking-tighter">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {importedServices
              ? "Facturar Servicios Seleccionados"
              : "Nueva Factura Manual"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* SECCIÓN CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Cliente Receptor *
              </Label>
              <Select
                value={clienteId}
                onValueChange={setClienteId}
                disabled={loadingClients || !!importedServices}
              >
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue
                    placeholder={
                      loadingClients ? "Cargando..." : "Seleccionar cliente"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id.toString()}
                      className="font-bold text-xs uppercase"
                    >
                      {client.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                RFC Fiscal
              </Label>
              <Input
                value={selectedClient?.rfc || ""}
                disabled
                className="h-11 bg-muted font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* PARÁMETROS FACTURA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Fecha Emisión
              </Label>
              <Input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="h-11 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Plazo Crédito
              </Label>
              <Select
                value={String(diasCredito)}
                onValueChange={(v) => setDiasCredito(Number(v))}
              >
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {creditDaysOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={String(opt.value)}
                      className="font-bold"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Moneda
              </Label>
              <Select
                value={moneda}
                onValueChange={(v: "MXN" | "USD") => setMoneda(v)}
              >
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN" className="font-bold">
                    🇲🇽 MXN - Pesos
                  </SelectItem>
                  <SelectItem value="USD" className="font-bold">
                    🇺🇸 USD - Dólares
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between shadow-sm">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Vencimiento Proyectado:
            </span>
            <span className="font-mono font-black text-blue-700 dark:text-blue-300">
              {fechaVencimiento}
            </span>
          </div>

          {/* LISTA DE CONCEPTOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Detalle de Conceptos
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConcepto}
                className="h-8 text-[10px] font-black uppercase tracking-tighter gap-1.5 rounded-lg"
              >
                <Plus className="h-3 w-3" /> Añadir Renglón
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {conceptos.map((concepto) => (
                <div
                  key={concepto.id}
                  className="grid grid-cols-12 gap-3 items-start p-3 bg-card rounded-xl border border-border group hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                >
                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <Input
                      placeholder="Descripción del servicio..."
                      value={concepto.descripcion}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "descripcion",
                          e.target.value,
                        )
                      }
                      className="h-9 text-xs font-bold uppercase"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
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
                      className="h-9 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
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
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1 flex items-center h-9 font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                    ${concepto.importe.toLocaleString("es-MX")}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConcepto(concepto.id)}
                      disabled={conceptos.length === 1}
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER Y TOTAL */}
        <div className="p-6 bg-muted/50 border-t border-border space-y-4">
          <div className="flex items-center justify-between bg-brand-navy rounded-2xl p-5 text-white shadow-xl ring-4 ring-background">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest opacity-80">
                Total Factura
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black font-mono tracking-tighter">
                ${montoTotal.toLocaleString("es-MX")}
              </span>
              <span className="ml-2 text-xs font-bold opacity-60 uppercase">
                {moneda}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-bold uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!clienteId || montoTotal <= 0 || loadingClients}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-emerald-600/20"
            >
              {loadingClients ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Generar Factura"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
