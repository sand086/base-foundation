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

import { toast } from "sonner";
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
} from "@/features/receivables/types";
import { useClients } from "@/features/clients/hooks/useClients";

// IMPORTAMOS TU HOOK DE CATÁLOGOS SAT
import { useSatCatalogs } from "@/features/settings/hooks/useSatCatalogs";

interface SmartInvoiceConcept {
  id: string;
  claveProdServ: string;
  claveUnidad: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

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
      cliente_email?: string;
      conceptos: SmartInvoiceConcept[];
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

//   FIX: Lista Inteligente de Unidades de Medida SAT (Las más usadas en Logística y Transporte)
const SAT_UNITS = [
  { clave: "E48", descripcion: "Unidad de servicio" },
  { clave: "ACT", descripcion: "Actividad" },
  { clave: "E51", descripcion: "Trabajo" },
  { clave: "DAY", descripcion: "Día (Estadías)" },
  { clave: "HUR", descripcion: "Hora (Retrasos)" },
  { clave: "MON", descripcion: "Mes" },
  { clave: "H87", descripcion: "Pieza" },
  { clave: "KGM", descripcion: "Kilogramo" },
  { clave: "TNE", descripcion: "Tonelada métrica" },
  { clave: "LTR", descripcion: "Litro" },
  { clave: "XBX", descripcion: "Caja" },
  { clave: "Q3", descripcion: "Comida (Viáticos)" },
  { clave: "ROM", descripcion: "Habitación (Hospedaje)" },
];

export function CreateInvoiceModal({
  open,
  onOpenChange,
  onSubmit,
  importedServices,
}: CreateInvoiceModalProps) {
  const { clients, isLoading: loadingClients } = useClients();

  // Obtenemos los productos del SAT desde tu custom hook
  const { products: satProducts, loading: loadingSatProducts } =
    useSatCatalogs();

  const [clienteId, setClienteId] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  // Estados para controlar QUÉ renglón tiene el Popover abierto
  const [openSatPopoverId, setOpenSatPopoverId] = useState<string | null>(null);
  const [openUnidadPopoverId, setOpenUnidadPopoverId] = useState<string | null>(
    null,
  );

  // Estados para Información Fiscal Editable (CFDI 4.0)
  const [razonSocialEditable, setRazonSocialEditable] = useState("");
  const [rfcEditable, setRfcEditable] = useState("");
  const [cpEditable, setCpEditable] = useState("");
  const [regimenEditable, setRegimenEditable] = useState("601");
  const [usoCfdiEditable, setUsoCfdiEditable] = useState("G03");
  const [emailEditable, setEmailEditable] = useState("");

  const [diasCredito, setDiasCredito] = useState(30);
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [metodoPago, setMetodoPago] = useState<"PUE" | "PPD">("PPD");
  const [formaPago, setFormaPago] = useState("99");

  const [tipoImpuesto, setTipoImpuesto] = useState<
    "FLETE" | "MANIOBRA" | "EXENTO"
  >("MANIOBRA");

  const [conceptos, setConceptos] = useState<SmartInvoiceConcept[]>([]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id.toString() === clienteId),
    [clients, clienteId],
  );

  // Autofill Inteligente
  useEffect(() => {
    if (selectedClient) {
      setRazonSocialEditable(selectedClient.razon_social || "");
      setRfcEditable(selectedClient.rfc || "");
      setCpEditable(
        (selectedClient as any).codigo_postal_fiscal ||
          (selectedClient as any).codigo_postal ||
          "",
      );
      setRegimenEditable((selectedClient as any).regimen_fiscal || "601");
      setUsoCfdiEditable((selectedClient as any).uso_cfdi || "G03");
      setEmailEditable(
        (selectedClient as any).email || (selectedClient as any).correo || "",
      );
    }
  }, [selectedClient]);

  // Inicialización de Conceptos Inteligentes
  useEffect(() => {
    if (open) {
      if (importedServices && importedServices.length > 0) {
        setClienteId(importedServices[0].clienteId.toString());
        setTipoImpuesto("FLETE");

        const newConceptos: SmartInvoiceConcept[] = importedServices.map(
          (srv, idx) => ({
            id: `IMP-${idx}-${Date.now()}`,
            claveProdServ: "78101802", // Transporte de carga
            claveUnidad: "E48",
            descripcion: `Servicio de transporte: ${srv.ruta} (${srv.tipoUnidad})`,
            cantidad: 1,
            precioUnitario: srv.monto,
            importe: srv.monto,
          }),
        );
        setConceptos(newConceptos);
      } else {
        setClienteId("");
        setRazonSocialEditable("");
        setRfcEditable("");
        setCpEditable("");
        setEmailEditable("");
        setRegimenEditable("601");
        setUsoCfdiEditable("G03");
        setTipoImpuesto("MANIOBRA");

        setConceptos([
          {
            id: "1",
            claveProdServ: "78101800", // Maniobras por defecto
            claveUnidad: "E48",
            descripcion: "",
            cantidad: 1,
            precioUnitario: 0,
            importe: 0,
          },
        ]);
      }
    }
  }, [importedServices, open, tipoImpuesto]);

  const fechaVencimiento = useMemo(() => {
    const date = new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date.toISOString().split("T")[0];
  }, [fechaEmision, diasCredito]);

  const subtotal = useMemo(
    () => conceptos.reduce((sum, c) => sum + c.importe, 0),
    [conceptos],
  );

  const iva = useMemo(() => {
    return tipoImpuesto === "FLETE" || tipoImpuesto === "MANIOBRA"
      ? subtotal * 0.16
      : 0;
  }, [subtotal, tipoImpuesto]);

  const retenciones = useMemo(() => {
    return tipoImpuesto === "FLETE" ? subtotal * 0.04 : 0;
  }, [subtotal, tipoImpuesto]);

  const montoTotal = useMemo(
    () => subtotal + iva - retenciones,
    [subtotal, iva, retenciones],
  );

  const addConcepto = () => {
    setConceptos([
      ...conceptos,
      {
        id: String(Date.now()),
        claveProdServ: tipoImpuesto === "FLETE" ? "78101802" : "78101800",
        claveUnidad: "E48",
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
    field: keyof SmartInvoiceConcept,
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
      !razonSocialEditable ||
      !rfcEditable ||
      !cpEditable ||
      conceptos.some(
        (c) => !c.claveProdServ || !c.claveUnidad || !c.descripcion,
      )
    ) {
      toast.error("Faltan datos obligatorios del SAT", {
        description:
          "Revisa que todos los conceptos tengan Clave SAT, Unidad y Descripción.",
      });
      return;
    }

    onSubmit({
      client_id: Number(clienteId),
      cliente: razonSocialEditable,
      cliente_rfc: rfcEditable,
      cp_receptor: cpEditable,
      regimen_fiscal_receptor: regimenEditable,
      uso_cfdi: usoCfdiEditable,
      cliente_email: emailEditable,
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
      <DialogContent className="w-[95vw] sm:max-w-6xl p-0 flex flex-col max-h-[95vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
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
                  : "Nueva Factura Directa"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Cuentas por cobrar • Validar Datos CFDI 4.0
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* SECCIÓN CLIENTE E INFORMACIÓN FISCAL COMPLETA (CFDI 4.0) */}
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest border-b border-border pb-2">
                Datos del Receptor (Editables para SAT)
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Buscador */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Buscar Cliente del Catálogo
                  </Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full h-11 justify-between font-bold shadow-sm bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 uppercase overflow-hidden"
                        disabled={loadingClients || !!importedServices}
                      >
                        <span className="truncate">
                          {clienteId
                            ? "✓ Cliente Seleccionado"
                            : loadingClients
                              ? "Cargando..."
                              : "Seleccionar cliente..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 border-slate-200 dark:border-white/10 z-[100]">
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
                    Razón Social (SAT sin S.A. de C.V.) *
                  </Label>
                  <Input
                    value={razonSocialEditable}
                    onChange={(e) => setRazonSocialEditable(e.target.value)}
                    placeholder="Ej. RAPIDOS 3T"
                    className="h-11 font-bold uppercase tracking-wide shadow-sm bg-card focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    RFC Fiscal *
                  </Label>
                  <Input
                    value={rfcEditable}
                    onChange={(e) => setRfcEditable(e.target.value)}
                    placeholder="XAXX010101000"
                    className="h-11 font-mono font-bold uppercase tracking-widest shadow-sm focus:border-indigo-500"
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
                    className="h-11 font-mono font-bold uppercase tracking-widest shadow-sm focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Régimen Fiscal Receptor
                  </Label>
                  <Select
                    value={regimenEditable}
                    onValueChange={setRegimenEditable}
                  >
                    <SelectTrigger className="h-11 font-bold shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="601" className="font-bold text-xs">
                        601 - Gral. Ley Personas Morales
                      </SelectItem>
                      <SelectItem value="612" className="font-bold text-xs">
                        612 - PF Actividades Empresariales
                      </SelectItem>
                      <SelectItem value="626" className="font-bold text-xs">
                        626 - RESICO
                      </SelectItem>
                      <SelectItem value="603" className="font-bold text-xs">
                        603 - PM Fines no Lucrativos
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
                    <SelectTrigger className="h-11 font-bold shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G03" className="font-bold text-xs">
                        G03 - Gastos en general
                      </SelectItem>
                      <SelectItem value="G01" className="font-bold text-xs">
                        G01 - Adquisición mercancías
                      </SelectItem>
                      <SelectItem value="I04" className="font-bold text-xs">
                        I04 - Equipo computo
                      </SelectItem>
                      <SelectItem value="P01" className="font-bold text-xs">
                        P01 - Por definir
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* PARÁMETROS FACTURA Y FISCALES */}
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest border-b border-border pb-2">
                Condiciones de Facturación
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Fecha Emisión
                  </Label>
                  <Input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="h-11 font-mono font-bold shadow-sm bg-muted"
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
                    <SelectTrigger className="h-11 font-bold shadow-sm">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Esquema Impuestos
                  </Label>
                  <Select
                    value={tipoImpuesto}
                    onValueChange={(v: "FLETE" | "MANIOBRA" | "EXENTO") =>
                      setTipoImpuesto(v)
                    }
                  >
                    <SelectTrigger className="h-11 font-bold shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="FLETE"
                        className="font-bold text-[11px] text-emerald-600"
                      >
                        Flete (+16% IVA, -4% Ret)
                      </SelectItem>
                      <SelectItem
                        value="MANIOBRA"
                        className="font-bold text-[11px] text-blue-600"
                      >
                        Maniobras (+16% IVA)
                      </SelectItem>
                      <SelectItem
                        value="EXENTO"
                        className="font-bold text-[11px] text-slate-500"
                      >
                        Exento / Tasa 0%
                      </SelectItem>
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
                    <SelectTrigger className="h-11 font-bold shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN" className="font-bold">
                        🇲🇽 MXN
                      </SelectItem>
                      <SelectItem value="USD" className="font-bold">
                        🇺🇸 USD
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Método Pago (SAT)
                  </Label>
                  <Select
                    value={metodoPago}
                    onValueChange={(v: "PUE" | "PPD") => setMetodoPago(v)}
                  >
                    <SelectTrigger className="h-11 font-bold shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPD" className="font-bold text-xs">
                        PPD - Diferido
                      </SelectItem>
                      <SelectItem value="PUE" className="font-bold text-xs">
                        PUE - Sola Exhibición
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Forma Pago (SAT)
                  </Label>
                  <Select value={formaPago} onValueChange={setFormaPago}>
                    <SelectTrigger className="h-11 font-bold shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="99" className="font-bold text-xs">
                        99 - Por definir
                      </SelectItem>
                      <SelectItem value="03" className="font-bold text-xs">
                        03 - Transferencia
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/*   FIX FASE 4: LISTA DE CONCEPTOS INTELIGENTE (CON CLAVES Y UNIDADES SAT AUTOCOMPLETABLES) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Detalle de Conceptos y Claves SAT
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

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {conceptos.map((concepto, idx) => (
                <div
                  key={concepto.id}
                  className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Concepto {idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConcepto(concepto.id)}
                      disabled={conceptos.length === 1}
                      className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Fila 1: Claves SAT y Descripción */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Buscador Inteligente Producto SAT */}
                    <div className="space-y-1.5 md:col-span-4">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Clave Prod/Serv (SAT) *
                      </Label>
                      <Popover
                        open={openSatPopoverId === concepto.id}
                        onOpenChange={(open) =>
                          setOpenSatPopoverId(open ? concepto.id : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full h-9 justify-between text-xs font-mono font-bold shadow-sm px-3"
                            disabled={loadingSatProducts}
                          >
                            <span className="truncate">
                              {concepto.claveProdServ
                                ? `${concepto.claveProdServ} - ${satProducts.find((p) => p.clave === concepto.claveProdServ)?.descripcion?.substring(0, 15) || "SAT"}`
                                : "Buscar Clave..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[350px] p-0 z-[100]"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Buscar por número o nombre..." />
                            <CommandEmpty>
                              No se encontraron coincidencias en el SAT.
                            </CommandEmpty>
                            <CommandGroup className="max-h-[250px] overflow-y-auto custom-scrollbar">
                              {satProducts.map((prod) => (
                                <CommandItem
                                  key={prod.id}
                                  value={`${prod.clave} ${prod.descripcion}`}
                                  onSelect={() => {
                                    updateConcepto(
                                      concepto.id,
                                      "claveProdServ",
                                      prod.clave,
                                    );
                                    // Auto-rellenar descripción si está vacía
                                    if (!concepto.descripcion) {
                                      updateConcepto(
                                        concepto.id,
                                        "descripcion",
                                        prod.descripcion,
                                      );
                                    }
                                    setOpenSatPopoverId(null);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 flex-shrink-0",
                                      concepto.claveProdServ === prod.clave
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold mr-2">
                                    {prod.clave}
                                  </span>
                                  <span className="truncate text-xs">
                                    {prod.descripcion}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Buscador Inteligente Unidad SAT */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Unidad SAT *
                      </Label>
                      <Popover
                        open={openUnidadPopoverId === concepto.id}
                        onOpenChange={(open) =>
                          setOpenUnidadPopoverId(open ? concepto.id : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full h-9 justify-center text-xs font-mono font-bold shadow-sm px-2"
                          >
                            <span className="truncate">
                              {concepto.claveUnidad || "Elegir"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[250px] p-0 z-[100]"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Buscar unidad..." />
                            <CommandEmpty>No encontrada.</CommandEmpty>
                            <CommandGroup className="max-h-[250px] overflow-y-auto custom-scrollbar">
                              {SAT_UNITS.map((unit) => (
                                <CommandItem
                                  key={unit.clave}
                                  value={`${unit.clave} ${unit.descripcion}`}
                                  onSelect={() => {
                                    updateConcepto(
                                      concepto.id,
                                      "claveUnidad",
                                      unit.clave,
                                    );
                                    setOpenUnidadPopoverId(null);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 flex-shrink-0",
                                      concepto.claveUnidad === unit.clave
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold mr-2">
                                    {unit.clave}
                                  </span>
                                  <span className="truncate text-xs">
                                    {unit.descripcion}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5 md:col-span-6">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Descripción del Servicio *
                      </Label>
                      <Input
                        placeholder="Ej. Servicio de Maniobras..."
                        value={concepto.descripcion}
                        onChange={(e) =>
                          updateConcepto(
                            concepto.id,
                            "descripcion",
                            e.target.value,
                          )
                        }
                        className="h-9 text-xs font-bold uppercase shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Cantidad y Precios */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="space-y-1.5 md:col-span-3">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Cantidad *
                      </Label>
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
                        className="h-9 text-xs font-mono font-bold text-center shadow-sm bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-4">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Precio Unitario *
                      </Label>
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
                        className="h-9 text-xs font-mono font-bold shadow-sm bg-muted"
                      />
                    </div>
                    <div className="md:col-span-5 flex items-center justify-end h-9">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                          Importe
                        </span>
                        <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                          $
                          {concepto.importe.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER CON RESUMEN FINANCIERO */}
        <div className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-4 z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-foreground rounded-2xl p-5 text-background shadow-xl ring-4 ring-background gap-4">
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
              <div
                className={`flex justify-between gap-4 ${iva > 0 ? "text-emerald-400" : "text-slate-400"}`}
              >
                <span>+ IVA (16%):</span>
                <span>
                  ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className={`flex justify-between gap-4 ${retenciones > 0 ? "text-rose-400" : "text-slate-400"}`}
              >
                <span>- Retención (4%):</span>
                <span>
                  $
                  {retenciones.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

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
                !razonSocialEditable ||
                !rfcEditable ||
                !cpEditable ||
                conceptos.some(
                  (c) => !c.claveProdServ || !c.claveUnidad || !c.descripcion,
                )
              }
              className="w-full sm:w-auto haptic-press border-none text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              {loadingClients ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Generar Factura Directa"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
