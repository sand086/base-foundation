import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  ReceivableInvoice,
  FinalizableService,
  InvoiceConcept,
} from "@/features/receivables/types";
import { useClients } from "@/features/clients/hooks/useClients";

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    invoice: Omit<
      ReceivableInvoice,
      "id" | "folio_interno" | "payments" | "estatus"
    > & {
      uso_cfdi?: string;
      regimen_fiscal_receptor?: string;
      cp_receptor?: string;
      metodo_pago?: string;
      forma_pago?: string;
      requiere_rep?: boolean;
    },
  ) => void;
  importedServices?: FinalizableService[];
}

const creditDaysOptions = [
  { value: 0, label: "Contado (0 días)" },
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
  const { clients, isLoading: loadingClients } = useClients();

  const [clienteId, setClienteId] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  // 🚀 FIX FASE 4: Estados para Información Fiscal Editable
  const [rfcEditable, setRfcEditable] = useState("");
  const [cpEditable, setCpEditable] = useState("");
  const [regimenEditable, setRegimenEditable] = useState("601");
  const [usoCfdiEditable, setUsoCfdiEditable] = useState("G03");

  const [diasCredito, setDiasCredito] = useState(30);
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [metodoPago, setMetodoPago] = useState<"PUE" | "PPD">("PPD");
  const [formaPago, setFormaPago] = useState("99");
  const [aplicaImpuestos, setAplicaImpuestos] = useState<"SI" | "NO">("SI");

  const [conceptos, setConceptos] = useState<InvoiceConcept[]>([]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id.toString() === clienteId),
    [clients, clienteId],
  );

  // 🚀 Autofill Inteligente cuando cambia el cliente seleccionado
  useEffect(() => {
    if (selectedClient) {
      setRfcEditable(selectedClient.rfc || "");
      // Dependiendo de cómo se llame tu campo en la BD (codigo_postal_fiscal o codigo_postal)
      setCpEditable(
        (selectedClient as any).codigo_postal_fiscal ||
          (selectedClient as any).codigo_postal ||
          "",
      );
      setRegimenEditable((selectedClient as any).regimen_fiscal || "601");
      setUsoCfdiEditable((selectedClient as any).uso_cfdi || "G03");
    }
  }, [selectedClient]);

  useEffect(() => {
    if (open) {
      if (importedServices && importedServices.length > 0) {
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
        setClienteId("");
        setRfcEditable("");
        setCpEditable("");
        setRegimenEditable("601");
        setUsoCfdiEditable("G03");
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

  const fechaVencimiento = useMemo(() => {
    const date = new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date.toISOString().split("T")[0];
  }, [fechaEmision, diasCredito]);

  const subtotal = useMemo(
    () => conceptos.reduce((sum, c) => sum + c.importe, 0),
    [conceptos],
  );

  const iva = useMemo(
    () => (aplicaImpuestos === "SI" ? subtotal * 0.16 : 0),
    [subtotal, aplicaImpuestos],
  );
  const retenciones = useMemo(
    () => (aplicaImpuestos === "SI" ? subtotal * 0.04 : 0),
    [subtotal, aplicaImpuestos],
  );
  const montoTotal = useMemo(
    () => subtotal + iva - retenciones,
    [subtotal, iva, retenciones],
  );

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
    if (
      !clienteId ||
      conceptos.length === 0 ||
      montoTotal <= 0 ||
      !rfcEditable ||
      !cpEditable
    ) {
      return;
    }

    onSubmit({
      client_id: Number(clienteId),
      cliente: selectedClient?.razon_social || "",
      cliente_rfc: rfcEditable,
      cp_receptor: cpEditable,
      regimen_fiscal_receptor: regimenEditable,
      uso_cfdi: usoCfdiEditable,
      conceptos,
      subtotal: subtotal,
      iva: iva,
      retenciones: retenciones,
      monto_total: montoTotal,
      saldo_pendiente: montoTotal,
      moneda,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      dias_credito: diasCredito,
      metodo_pago: metodoPago,
      forma_pago: formaPago,
      servicios_relacionados: importedServices?.map((s) => s.id) || [],
      requiere_rep: metodoPago === "PPD",
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {importedServices
                  ? "Facturar Servicios"
                  : "Nueva Factura Manual"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Cuentas por cobrar • Facturación Directa
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-6">
          {/* SECCIÓN CLIENTE E INFORMACIÓN FISCAL (EDITABLE) */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest border-b border-border pb-2">
              Datos del Receptor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Cliente Receptor *
                </Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full h-11 justify-between font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 uppercase overflow-hidden"
                      disabled={loadingClients || !!importedServices}
                    >
                      <span className="truncate">
                        {clienteId
                          ? clients.find((c) => c.id.toString() === clienteId)
                              ?.razon_social
                          : loadingClients
                            ? "Cargando..."
                            : "Buscar cliente..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] sm:w-[400px] p-0 border-slate-200 dark:border-white/10 z-[100]">
                    <Command>
                      <CommandInput placeholder="Escribe para buscar..." />
                      <CommandEmpty>
                        No se encontró ningún cliente.
                      </CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.razon_social}
                            onSelect={() => {
                              setClienteId(client.id.toString());
                              setOpenCombobox(false);
                            }}
                            className="font-bold text-xs uppercase cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clienteId === client.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {client.razon_social}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  RFC Fiscal *
                </Label>
                <Input
                  value={rfcEditable}
                  onChange={(e) => setRfcEditable(e.target.value)}
                  placeholder="XAXX010101000"
                  className="h-11 font-mono font-bold uppercase tracking-widest shadow-sm bg-card border-slate-200 dark:border-white/10 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  C.P. (Domicilio) *
                </Label>
                <Input
                  value={cpEditable}
                  onChange={(e) => setCpEditable(e.target.value)}
                  placeholder="00000"
                  maxLength={5}
                  className="h-11 font-mono font-bold uppercase tracking-widest shadow-sm bg-card border-slate-200 dark:border-white/10 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Régimen Fiscal
                </Label>
                <Select
                  value={regimenEditable}
                  onValueChange={setRegimenEditable}
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="601" className="font-bold text-xs">
                      601 - General de Ley Personas Morales
                    </SelectItem>
                    <SelectItem value="612" className="font-bold text-xs">
                      612 - Personas Físicas con Actividades Empresariales
                    </SelectItem>
                    <SelectItem value="626" className="font-bold text-xs">
                      626 - Régimen Simplificado de Confianza (RESICO)
                    </SelectItem>
                    <SelectItem value="603" className="font-bold text-xs">
                      603 - Personas Morales con Fines no Lucrativos
                    </SelectItem>
                    <SelectItem value="616" className="font-bold text-xs">
                      616 - Sin obligaciones fiscales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Uso de CFDI
                </Label>
                <Select
                  value={usoCfdiEditable}
                  onValueChange={setUsoCfdiEditable}
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G03" className="font-bold text-xs">
                      G03 - Gastos en general
                    </SelectItem>
                    <SelectItem value="G01" className="font-bold text-xs">
                      G01 - Adquisición de mercancías
                    </SelectItem>
                    <SelectItem value="I04" className="font-bold text-xs">
                      I04 - Equipo de computo y accesorios
                    </SelectItem>
                    <SelectItem value="P01" className="font-bold text-xs">
                      P01 - Por definir
                    </SelectItem>
                    <SelectItem value="S01" className="font-bold text-xs">
                      S01 - Sin efectos fiscales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* PARÁMETROS FACTURA Y FISCALES */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest border-b border-border pb-2">
              Condiciones de Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Fecha Emisión
                </Label>
                <Input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="h-11 font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Plazo Crédito
                </Label>
                <Select
                  value={String(diasCredito)}
                  onValueChange={(v) => {
                    setDiasCredito(Number(v));
                    if (Number(v) > 0) setMetodoPago("PPD");
                  }}
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10">
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
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10">
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
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Impuestos (16% / 4%)
                </Label>
                <Select
                  value={aplicaImpuestos}
                  onValueChange={(v: "SI" | "NO") => setAplicaImpuestos(v)}
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="SI"
                      className="font-bold text-xs text-emerald-600"
                    >
                      Sí Aplicar
                    </SelectItem>
                    <SelectItem
                      value="NO"
                      className="font-bold text-xs text-slate-500"
                    >
                      Exento / Tasa 0%
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Método de Pago (SAT)
                </Label>
                <Select
                  value={metodoPago}
                  onValueChange={(v: "PUE" | "PPD") => setMetodoPago(v)}
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PPD" className="font-bold text-xs">
                      PPD - Parcialidades o Diferido
                    </SelectItem>
                    <SelectItem value="PUE" className="font-bold text-xs">
                      PUE - Pago en una Sola Exhibición
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Forma de Pago (SAT)
                </Label>
                <Select value={formaPago} onValueChange={setFormaPago}>
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="99" className="font-bold text-xs">
                      99 - Por definir
                    </SelectItem>
                    <SelectItem value="03" className="font-bold text-xs">
                      03 - Transferencia electrónica
                    </SelectItem>
                    <SelectItem value="01" className="font-bold text-xs">
                      01 - Efectivo
                    </SelectItem>
                    <SelectItem value="02" className="font-bold text-xs">
                      02 - Cheque nominativo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* LISTA DE CONCEPTOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest">
                Detalle de Conceptos (Subtotal)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConcepto}
                className="h-8 text-[10px] font-black uppercase tracking-tighter gap-1.5 rounded-lg haptic-press"
              >
                <Plus className="h-3 w-3" /> Añadir Renglón
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {conceptos.map((concepto) => (
                <div
                  key={concepto.id}
                  className="grid grid-cols-12 gap-3 items-start p-3 bg-card rounded-xl border border-border group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm"
                >
                  <div className="col-span-12 md:col-span-5 space-y-1.5">
                    <Input
                      placeholder="Descripción del servicio (ej. Maniobras)..."
                      value={concepto.descripcion}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "descripcion",
                          e.target.value,
                        )
                      }
                      className="h-9 text-xs font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Cant."
                      value={concepto.cantidad}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "cantidad",
                          Number(e.target.value),
                        )
                      }
                      className="h-9 text-xs font-mono font-bold text-center shadow-sm bg-muted border-slate-200 dark:border-white/5"
                    />
                  </div>
                  <div className="col-span-5 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Precio Unit."
                      value={concepto.precioUnitario}
                      onChange={(e) =>
                        updateConcepto(
                          concepto.id,
                          "precioUnitario",
                          Number(e.target.value),
                        )
                      }
                      className="h-9 text-xs font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2 flex items-center justify-end h-9 font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                    $
                    {concepto.importe.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
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

        {/* CAPA 5: FOOTER CON RESUMEN FINANCIERO */}
        <div className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-foreground rounded-2xl p-5 text-background shadow-xl ring-4 ring-background gap-4">
            {aplicaImpuestos === "SI" ? (
              <div className="flex flex-row sm:flex-col gap-4 sm:gap-1 text-xs opacity-80 font-mono font-medium justify-center w-full sm:w-auto">
                <div className="flex justify-between gap-4">
                  <span>Subtotal:</span>
                  <span>
                    $
                    {subtotal.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-400">
                  <span>+ IVA (16%):</span>
                  <span>
                    ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-rose-400">
                  <span>- Retención (4%):</span>
                  <span>
                    $
                    {retenciones.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs opacity-80 font-mono font-medium text-slate-400 uppercase tracking-widest">
                Sin Desglose de Impuestos
              </div>
            )}

            <div className="h-px w-full bg-white/20 sm:hidden block"></div>

            <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Total a Cobrar
                </span>
                <div className="text-right flex items-baseline">
                  <span className="text-3xl font-black font-mono tracking-tighter">
                    $
                    {montoTotal.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="ml-2 text-xs font-bold opacity-60 uppercase">
                    {moneda}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
              onClick={handleSubmit}
              disabled={
                !clienteId ||
                montoTotal <= 0 ||
                loadingClients ||
                !rfcEditable ||
                !cpEditable
              }
              className="w-full sm:w-auto haptic-press border-none text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              {loadingClients ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Generar Factura"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
