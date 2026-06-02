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

// IMPORTAMOS LOS HOOKS
import { useSatCatalogs } from "@/features/settings/hooks/useSatCatalogs";
import { useBilling } from "@/features/receivables/hooks/useBilling";

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
  onSubmit: () => void;
  importedServices?: FinalizableService[];
}

const creditDaysOptions = [
  { value: 0, label: "Contado (0 días)" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
  { value: 45, label: "45 días" },
  { value: 60, label: "60 días" },
];

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
  const { products: satProducts, loading: loadingSatProducts } =
    useSatCatalogs();

  // INYECTAMOS NUESTRO HOOK DE FACTURACIÓN
  const { generateOneShotInvoice, generateFreeInvoice, isStamping } =
    useBilling();

  const [clienteId, setClienteId] = useState("");
  const [subClienteId, setSubClienteId] = useState(""); // <-- Estado para el sub_client seleccionado
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openSubCombobox, setOpenSubCombobox] = useState(false); // <-- Estado para abrir/cerrar el popover del sub_client

  const [openSatPopoverId, setOpenSatPopoverId] = useState<string | null>(null);
  const [openUnidadPopoverId, setOpenUnidadPopoverId] = useState<string | null>(
    null,
  );

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

  // Normalizamos los datos operativos basados en los modelos de TypeScript
  const operationalInfo = useMemo(() => {
    if (!selectedClient) return null;

    const subClient = selectedClient.sub_clients?.find(
      (s) => s.id.toString() === subClienteId,
    );

    // Si seleccionó una sucursal, leemos las propiedades de SubClientResponse
    if (subClient) {
      return {
        type: "Sucursal",
        contacto: subClient.contacto,
        telefono: subClient.telefono,
        direccionCompleta: [
          subClient.direccion,
          subClient.ciudad,
          subClient.estado,
        ]
          .filter(Boolean)
          .join(", "),
      };
    }

    // Si no, leemos las propiedades de ClientResponse (Matriz)
    return {
      type: "Matriz",
      contacto: selectedClient.contacto_principal,
      telefono: selectedClient.telefono,
      direccionCompleta: selectedClient.direccion_fiscal,
    };
  }, [selectedClient, subClienteId]);

  // Autofill Inteligente Dividido
  useEffect(() => {
    if (selectedClient) {
      // 1. DATOS FISCALES OBLIGATORIOS (SIEMPRE DE LA MATRIZ - ClientResponse)
      setRazonSocialEditable(selectedClient.razon_social || "");
      setRfcEditable(selectedClient.rfc || "");
      setCpEditable(selectedClient.codigo_postal_fiscal || "");
      setRegimenEditable(selectedClient.regimen_fiscal || "601");
      setUsoCfdiEditable(selectedClient.uso_cfdi || "G03");

      // 2. CORREO (EL SUB-CLIENTE NO TIENE CORREO, SE TOMA DE LA MATRIZ O SE PUEDE EDITAR MANUALMENTE)
      setEmailEditable(selectedClient.email || "");
    }
  }, [selectedClient, subClienteId]);

  // Inicialización de Conceptos Inteligentes y Reseteos
  useEffect(() => {
    if (open) {
      if (importedServices && importedServices.length > 0) {
        setClienteId(importedServices[0].clienteId.toString());
        setSubClienteId("");
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
        setSubClienteId("");
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

  const handleSubmit = async () => {
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

    const payload = {
      client_id: Number(clienteId),
      sub_client_id: subClienteId ? Number(subClienteId) : null,
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
      moneda,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      dias_credito: diasCredito,
      metodo_pago: metodoPago,
      forma_pago: formaPago,
    };

    let result;

    if (importedServices && importedServices.length > 0) {
      const dataWithTrip = {
        ...payload,
        viaje_id: importedServices[0].id,
        servicios_relacionados: importedServices.map((s) => s.id),
      };
      result = await generateOneShotInvoice(dataWithTrip);
    } else {
      result = await generateFreeInvoice(payload);
    }

    if (result) {
      if (result.data && result.data.uuid) {
        window.open(`/api/sat/invoice/${result.data.uuid}/pdf`, "_blank");
      }
      onSubmit();
      onOpenChange(false);
    }
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
            {/* SECCIÓN CLIENTE E INFORMACIÓN FISCAL COMPLETA */}
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-brand-navy dark:text-white uppercase tracking-widest border-b border-border pb-2">
                Datos del Receptor (Editables para SAT)
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Buscador de Cliente Matriz */}
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
                            ? `✓ ${clients.find((c) => c.id.toString() === clienteId)?.razon_social || "Cliente Seleccionado"}`
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
                                setSubClienteId(""); // Reseteamos la sucursal
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

                {/* Selector Dinámico de Sucursales (sub_clients) */}
                {selectedClient &&
                  selectedClient.sub_clients &&
                  selectedClient.sub_clients.length > 0 && (
                    <div className="space-y-2 mt-1 transition-all">
                      <Label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        Especificar Sub-Cliente / Sucursal (Opcional)
                      </Label>
                      <Popover
                        open={openSubCombobox}
                        onOpenChange={setOpenSubCombobox}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openSubCombobox}
                            className="w-full h-11 justify-between font-bold shadow-sm bg-slate-50 border-slate-200 dark:bg-slate-900/10 text-slate-700 dark:text-slate-300 uppercase overflow-hidden"
                          >
                            <span className="truncate">
                              {subClienteId
                                ? `✓ Sucursal: ${selectedClient.sub_clients.find((s) => s.id.toString() === subClienteId)?.nombre || "Seleccionado"}`
                                : "Facturar a la Matriz principal"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 border-slate-200 dark:border-white/10 z-[100]">
                          <Command>
                            <CommandInput placeholder="Buscar sucursal..." />
                            <CommandEmpty>
                              No se encontraron sucursales registradas.
                            </CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto custom-scrollbar">
                              <CommandItem
                                value="matriz-principal-clear-option"
                                onSelect={() => {
                                  setSubClienteId("");
                                  setOpenSubCombobox(false);
                                }}
                                className="font-bold text-xs uppercase text-muted-foreground cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    subClienteId === ""
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                [ Sin sucursal ]
                              </CommandItem>

                              {selectedClient.sub_clients.map((sub) => (
                                <CommandItem
                                  key={sub.id}
                                  value={sub.nombre}
                                  onSelect={() => {
                                    setSubClienteId(sub.id.toString());
                                    setOpenSubCombobox(false);
                                  }}
                                  className="font-bold text-xs uppercase cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      subClienteId === sub.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {sub.nombre}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                {/* BLOQUE VISUAL DE DATOS OPERATIVOS / DESTINO */}
                {operationalInfo && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 space-y-3">
                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 pb-2 flex items-center justify-between">
                      <span>Datos de Destino / Operativos</span>
                      <span className="text-muted-foreground opacity-60">
                        ({operationalInfo.type})
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          Contacto
                        </span>
                        <span className="font-bold text-foreground">
                          {operationalInfo.contacto || "No registrado"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          Teléfono
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {operationalInfo.telefono || "No registrado"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          Dirección de Operación
                        </span>
                        <span className="font-medium text-foreground leading-tight block">
                          {operationalInfo.direccionCompleta || "No registrada"}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-white/10">
                        <Label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">
                          Correo de Envío (Editable) *
                        </Label>
                        <Input
                          value={emailEditable}
                          onChange={(e) => setEmailEditable(e.target.value)}
                          placeholder="correo@empresa.com"
                          className="h-9 font-medium shadow-sm bg-white dark:bg-card focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Razón Social Fiscal (SAT sin S.A. de C.V.) *
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
                    C.P. Fiscal (SAT) *
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

                  {/* Fila 2: Cantidades, Costo e Importe calculado */}
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

        {/* FOOTER: CALCULADORA DE IMPUESTOS Y ACCIONES */}
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
                isStamping ||
                !razonSocialEditable ||
                !rfcEditable ||
                !cpEditable ||
                conceptos.some(
                  (c) => !c.claveProdServ || !c.claveUnidad || !c.descripcion,
                )
              }
              className="w-full sm:w-auto haptic-press border-none text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.3)] font-black uppercase tracking-widest text-[10px]"
            >
              {isStamping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Timbrando
                  SAT...
                </>
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
