// src/features/combustible/AddTicketModal.tsx
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Fuel,
  Camera,
  CheckCircle2,
  Upload,
  Droplets,
  MapPin,
  ChevronsUpDown,
  Check,
  Gauge,
  User,
  Truck,
  FilterX,
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRECIOS_PROMEDIO, type TipoCombustible } from "@/data/combustibleData";

// 🚀 IMPORTAMOS TODOS LOS HOOKS REALES
import { useClients } from "@/hooks/useClients";
import { useTrips } from "@/hooks/useTrips";
import { useOperators } from "@/hooks/useOperators";
import { useUnits } from "@/hooks/useUnits";

/** =========================
 * Types
 * ========================= */
type ID = string | number;

export interface Unit {
  id: ID;
  numero_economico?: string | null;
  placas?: string | null;
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;
  capacidadTanqueDiesel?: number | null;
  capacidadTanqueUrea?: number | null;
}

export interface Operator {
  id: ID;
  name?: string | null;
  nombre?: string | null;
}

export interface TicketFormData {
  unidadId: string;
  operadorId: string;
  viajeId: string;
  fechaHora: string;
  estacion: string;
  tipoCombustible: TipoCombustible;
  litros: number;
  precioPorLitro: number;
  odometro: number | string; // Permitimos string vacío temporalmente
  evidencia: File | null;
}

// 🚀 AHORA EL MODAL YA NO PIDE LAS LISTAS POR PROPS, LAS SACA ÉL MISMO
interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => void;
}

/** =========================
 * Helpers & Componentes
 * ========================= */

// COMPONENTE REUTILIZABLE: Buscador Inteligente a prueba de fallos
function SearchableSelect({
  items,
  value,
  onSelect,
  placeholder,
}: {
  items: { label: string; value: string }[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = items.find((item) => item.value === value);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const lowerSearch = normalize(searchQuery);
    return items.filter((item) => normalize(item.label).includes(lowerSearch));
  }, [items, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-white h-11 text-sm border-slate-300 shadow-sm hover:bg-slate-50"
        >
          {selectedItem ? (
            <span className="truncate font-bold text-slate-800">
              {selectedItem.label}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-full p-0 shadow-2xl border-slate-200 z-[9999]"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribe para buscar..."
            className="h-11 text-sm"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <CommandEmpty className="p-4 text-center text-sm text-slate-500">
                No se encontraron coincidencias.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => {
                      onSelect(item.value);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer py-3 border-b border-slate-50 last:border-0"
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 flex-shrink-0 text-emerald-600",
                        value === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {item.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function clampFileSize(file: File, maxMB: number) {
  return file.size <= maxMB * 1024 * 1024;
}

function safeNumber(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value: string, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getDieselCapacity(unit: any): number | null {
  return unit?.capacidad_tanque_diesel ?? unit?.capacidadTanqueDiesel ?? null;
}

function getUreaCapacity(unit: any): number | null {
  return unit?.capacidad_tanque_urea ?? unit?.capacidadTanqueUrea ?? null;
}

export function AddTicketModal({
  open,
  onOpenChange,
  onSubmit,
}: AddTicketModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🚀 1. USAMOS LOS HOOKS DIRECTAMENTE DENTRO DEL MODAL
  const { clients = [] } = useClients();
  const { trips = [] } = useTrips();
  const { operadores = [] } = useOperators(); // Nota: En tu console log vi que devuelve `operadores` y no `operators`
  const { unidades = [] } = useUnits(); // Nota: En tu console log vi que devuelve `unidades` y no `units`

  // 🚀 2. CONSOLES DE DEBUG PARA VER QUÉ LLEGA REALMENTE
  useEffect(() => {
    if (open) {
      console.log("=== DEBUG DATOS EN MODAL ===");
      console.log("CLIENTES FETCHED:", clients);
      console.log("VIAJES FETCHED:", trips);
      console.log("OPERADORES FETCHED:", operadores);
      console.log("UNIDADES FETCHED:", unidades);
      console.log("============================");
    }
  }, [open, clients, trips, operadores, unidades]);

  const [formData, setFormData] = useState<TicketFormData>({
    unidadId: "",
    operadorId: "",
    viajeId: "",
    fechaHora: toDatetimeLocalValue(new Date()),
    estacion: "",
    tipoCombustible: "diesel",
    litros: 0,
    precioPorLitro: PRECIOS_PROMEDIO.diesel,
    odometro: "", // Inicializado vacío
    evidencia: null,
  });

  // Filtros Avanzados
  const [filterClient, setFilterClient] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      fechaHora: toDatetimeLocalValue(new Date()),
    }));
  }, [open]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      precioPorLitro: PRECIOS_PROMEDIO[prev.tipoCombustible],
    }));
  }, [formData.tipoCombustible]);

  const selectedUnit = useMemo(() => {
    if (!formData.unidadId || !Array.isArray(unidades)) return undefined;
    return unidades.find((u: any) => String(u.id) === formData.unidadId);
  }, [unidades, formData.unidadId]);

  // 1. Filtrar viajes (Excluir liquidados globalmente)
  const activeTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.filter((t: any) => {
      if (String(t.status).toLowerCase() === "liquidado") return false;
      return true;
    });
  }, [trips]);

  // 2. Extraer clientes
  const availableClientsForFilter = useMemo(() => {
    if (!Array.isArray(clients) || !Array.isArray(activeTrips)) return [];
    const activeClientIds = new Set(
      activeTrips.map((t) => String(t.client_id)),
    );
    const matchingClients = clients.filter((c: any) =>
      activeClientIds.has(String(c.id)),
    );

    return matchingClients.sort((a: any, b: any) => {
      const nameA = a.razon_social || a.nombre || "";
      const nameB = b.razon_social || b.nombre || "";
      return nameA.localeCompare(nameB);
    });
  }, [activeTrips, clients]);

  // 3. Aplicar Filtros (Cliente y Fecha)
  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t: any) => {
      // Filtro Cliente
      const matchClient =
        filterClient === "ALL" || String(t.client_id) === filterClient;

      // Filtro Rango Fechas
      let matchDate = true;
      const tripDate = new Date(t.start_date || t.created_at);

      if (dateFrom) {
        const fromD = new Date(`${dateFrom}T00:00:00`);
        if (tripDate < fromD) matchDate = false;
      }

      if (dateTo) {
        const toD = new Date(`${dateTo}T23:59:59`);
        if (tripDate > toD) matchDate = false;
      }

      return matchClient && matchDate;
    });
  }, [activeTrips, filterClient, dateFrom, dateTo]);

  // 4. Formatear para el Buscador de Viajes
  const searchableTrips = useMemo(() => {
    const list = filteredTrips.map((t: any) => {
      const foundClient = Array.isArray(clients)
        ? clients.find((c: any) => String(c.id) === String(t.client_id))
        : null;

      const cName =
        foundClient?.razon_social ||
        foundClient?.rfc ||
        t.client?.razon_social ||
        t.client?.nombre ||
        "Sin Cliente";

      const dateStr = new Date(t.start_date || t.created_at).toLocaleDateString(
        "es-MX",
      );

      const label = `FOLIO ${t.public_id || t.id} | ${cName} | ${t.origin} ➔ ${t.destination} | ${dateStr} (${t.status.toUpperCase()})`;
      return { label, value: String(t.id) };
    });

    return [
      {
        label: "📍 Carga Local / Pendiente de Asignar (Sin Viaje)",
        value: "none",
      },
      ...list,
    ];
  }, [filteredTrips, clients]);

  // Transformar Unidades para el Select Inteligente
  const searchableUnits = useMemo(() => {
    if (!Array.isArray(unidades)) return [];
    return unidades.map((u: any) => ({
      label: `${u.numero_economico} - ${u.placas || "S/P"}`,
      value: String(u.id),
    }));
  }, [unidades]);

  // Transformar Operadores para el Select Inteligente
  const searchableOperators = useMemo(() => {
    if (!Array.isArray(operadores)) return [];
    return operadores.map((o: any) => ({
      label: o.name || o.nombre || `Operador #${o.id}`,
      value: String(o.id),
    }));
  }, [operadores]);

  // MANEJADOR SÚPER INTELIGENTE: Auto-Fill
  const handleTripSelection = (selectedTripId: string) => {
    if (selectedTripId === "none") {
      setFormData((prev) => ({ ...prev, viajeId: "" }));
      return;
    }

    const tripObj = activeTrips.find(
      (t: any) => String(t.id) === selectedTripId,
    );

    if (tripObj) {
      const activeLeg =
        tripObj.legs?.find(
          (l: any) =>
            !["entregado", "cerrado", "liquidado"].includes(
              String(l.status).toLowerCase(),
            ),
        ) || tripObj.legs?.[tripObj.legs?.length - 1];

      setFormData((prev) => ({
        ...prev,
        viajeId: selectedTripId,
        unidadId: activeLeg?.unit_id
          ? String(activeLeg.unit_id)
          : prev.unidadId,
        operadorId: activeLeg?.operator_id
          ? String(activeLeg.operator_id)
          : prev.operadorId,
      }));

      toast.success("Viaje Vinculado", {
        description:
          "Se han cargado la unidad y el operador registrados en el viaje.",
      });
    } else {
      setFormData((prev) => ({ ...prev, viajeId: selectedTripId }));
    }
  };

  const tankCapacity = useMemo(() => {
    if (!selectedUnit) return 0;
    if (formData.tipoCombustible === "diesel") {
      return (selectedUnit.capacidad_carga ?? 600) as number;
    }
    return (selectedUnit.capacidad_carga ?? 40) as number;
  }, [selectedUnit, formData.tipoCombustible]);

  const isOverCapacity =
    Boolean(selectedUnit) && formData.litros > tankCapacity;

  const total = useMemo(
    () => (formData.litros || 0) * (formData.precioPorLitro || 0),
    [formData.litros, formData.precioPorLitro],
  );

  const getFuelTypeStyles = (type: TipoCombustible, isSelected: boolean) => {
    if (type === "diesel")
      return isSelected
        ? "bg-amber-500 text-white border-amber-500 shadow-md"
        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
    return isSelected
      ? "bg-sky-500 text-white border-sky-500 shadow-md"
      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
  };

  const clearFilters = () => {
    setFilterClient("ALL");
    setDateFrom("");
    setDateTo("");
    setFormData((prev) => ({ ...prev, viajeId: "" }));
  };

  const resetForm = () => {
    setFormData({
      unidadId: "",
      operadorId: "",
      viajeId: "",
      fechaHora: toDatetimeLocalValue(new Date()),
      estacion: "",
      tipoCombustible: "diesel",
      litros: 0,
      precioPorLitro: PRECIOS_PROMEDIO.diesel,
      odometro: "", // Limpio y sin ceros forzados
      evidencia: null,
    });
    clearFilters();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    if (!formData.unidadId) return "Selecciona una unidad.";
    if (!formData.operadorId) return "Selecciona un operador.";
    if (!formData.fechaHora) return "Selecciona fecha y hora.";
    if (!formData.estacion.trim()) return "Escribe la estación de servicio.";
    if (!(formData.litros > 0)) return "Los litros deben ser mayor a 0.";
    if (!(formData.precioPorLitro > 0))
      return "El precio por litro debe ser mayor a 0.";
    if (isOverCapacity)
      return `Excede la capacidad técnica del tanque (${tankCapacity}L).`;
    if (formData.evidencia && !clampFileSize(formData.evidencia, 5))
      return "El archivo de imagen excede los 5MB.";
    return null;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error("Datos Incompletos", { description: error });
      return;
    }

    const finalData = {
      ...formData,
      odometro: safeInt(String(formData.odometro), 0),
    };

    onSubmit(finalData);
    toast.success("Carga Exitosa", {
      description: "Ticket de combustible registrado en el sistema.",
    });
    resetForm();
    onOpenChange(false);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setFormData((p) => ({ ...p, evidencia: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Formato inválido", {
        description: "Por favor suba una fotografía (JPG, PNG).",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!clampFileSize(file, 5)) {
      toast.error("Archivo muy pesado", {
        description: "El límite de subida es de 5MB.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFormData((p) => ({ ...p, evidencia: file }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-2xl bg-slate-50">
        {/* HEADER */}
        <DialogHeader className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-3 text-slate-800 text-xl font-black">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                formData.tipoCombustible === "diesel"
                  ? "bg-amber-100"
                  : "bg-sky-100",
              )}
            >
              {formData.tipoCombustible === "diesel" ? (
                <Fuel className="h-6 w-6 text-amber-600" />
              ) : (
                <Droplets className="h-6 w-6 text-sky-600" />
              )}
            </div>
            <div>
              Registro de Inyección de Combustible
              <p className="text-xs font-medium text-slate-500 font-normal mt-1 tracking-normal">
                Capture los datos del ticket para la conciliación financiera.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LADO IZQUIERDO: VINCULACIÓN OPERATIVA */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b pb-2">
                  <MapPin className="h-4 w-4 text-brand-navy" /> 1. Vinculación
                  Operativa
                </h3>

                {/* Panel de Filtros y Búsqueda de Viajes */}
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-brand-navy uppercase tracking-widest">
                      Asociar a un Viaje Activo
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-6 text-[10px] text-blue-600 hover:text-blue-800 px-2"
                    >
                      <FilterX className="h-3 w-3 mr-1" /> Limpiar Filtros
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">
                        Cliente
                      </Label>
                      <Select
                        value={filterClient}
                        onValueChange={setFilterClient}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white shadow-sm border-slate-300">
                          <SelectValue placeholder="Todos..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">
                            Todos los clientes
                          </SelectItem>
                          {availableClientsForFilter.map((c: any) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.razon_social || c.rfc || `Cliente #${c.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">
                        Rango de Fechas
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          className="h-9 text-xs bg-white shadow-sm border-slate-300 px-1"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          title="Desde"
                        />
                        <span className="text-[10px] text-slate-400">-</span>
                        <Input
                          type="date"
                          className="h-9 text-xs bg-white shadow-sm border-slate-300 px-1"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          title="Hasta"
                        />
                      </div>
                    </div>
                  </div>

                  <SearchableSelect
                    items={searchableTrips}
                    value={formData.viajeId}
                    onSelect={handleTripSelection}
                    placeholder="Escriba folio, ruta o seleccione..."
                  />
                </div>

                {/* BUSCADORES INTELIGENTES EN UNIDAD Y OPERADOR */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" /> Unidad *
                    </Label>
                    <SearchableSelect
                      items={searchableUnits}
                      value={formData.unidadId}
                      onSelect={(value) =>
                        setFormData((p) => ({ ...p, unidadId: value }))
                      }
                      placeholder="Buscar unidad..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Operador *
                    </Label>
                    <SearchableSelect
                      items={searchableOperators}
                      value={formData.operadorId}
                      onSelect={(value) =>
                        setFormData((p) => ({ ...p, operadorId: value }))
                      }
                      placeholder="Buscar operador..."
                    />
                  </div>
                </div>

                {/* ODÓMETRO OPCIONAL */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" /> Lectura de Odómetro (Km)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Opcional. Ej: 245890"
                    value={formData.odometro || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        odometro: e.target.value,
                      }))
                    }
                    className="h-11 font-mono text-sm bg-white shadow-sm border-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    No es obligatorio, pero se recomienda para cálculo exacto de
                    rendimiento.
                  </p>
                </div>
              </div>
            </div>

            {/* LADO DERECHO: DATOS DEL TICKET Y FOTO */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b pb-2">
                  <Fuel className="h-4 w-4 text-amber-500" /> 2. Carga Física y
                  Evidencia
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        tipoCombustible: "diesel",
                        litros: 0,
                      }))
                    }
                    className={cn(
                      "flex items-center justify-center gap-3 py-2.5 px-3 rounded-xl border-2 transition-all",
                      formData.tipoCombustible === "diesel"
                        ? "bg-amber-500 border-amber-500 text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Fuel className="h-4 w-4" />
                    <div className="text-left leading-tight">
                      <div className="font-bold text-sm">Diésel</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        tipoCombustible: "urea",
                        litros: 0,
                      }))
                    }
                    className={cn(
                      "flex items-center justify-center gap-3 py-2.5 px-3 rounded-xl border-2 transition-all",
                      formData.tipoCombustible === "urea"
                        ? "bg-sky-500 border-sky-500 text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Droplets className="h-4 w-4" />
                    <div className="text-left leading-tight">
                      <div className="font-bold text-sm">Urea (DEF)</div>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Fecha y Hora *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={formData.fechaHora}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          fechaHora: e.target.value,
                        }))
                      }
                      className="h-11 text-sm bg-white shadow-sm border-slate-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Estación de Servicio *
                    </Label>
                    <Input
                      placeholder={
                        formData.tipoCombustible === "diesel"
                          ? "Ej: Parador San Marcos"
                          : "Ej: AdBlue Center"
                      }
                      value={formData.estacion}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, estacion: e.target.value }))
                      }
                      className="h-11 text-sm bg-white shadow-sm border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Litros Inyectados *
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.litros || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            litros: safeNumber(e.target.value, 0),
                          }))
                        }
                        className={cn(
                          "h-11 text-base font-mono pl-3 pr-8 bg-white shadow-sm",
                          isOverCapacity
                            ? "border-red-500 text-red-600 ring-1 ring-red-500"
                            : "border-slate-300",
                        )}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        L
                      </span>
                    </div>
                    {isOverCapacity && (
                      <p className="text-[10px] text-red-600 font-bold">
                        ⚠️ Excede capacidad ({tankCapacity}L)
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Precio Unitario *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.precioPorLitro || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            precioPorLitro: safeNumber(e.target.value, 0),
                          }))
                        }
                        className="h-11 text-base font-mono pl-8 bg-white shadow-sm border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-2 rounded-xl p-4 border flex justify-between items-center shadow-inner",
                    formData.tipoCombustible === "diesel"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-sky-50 border-sky-200",
                  )}
                >
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                    Total Calculado
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-black font-mono tracking-tighter",
                      formData.tipoCombustible === "diesel"
                        ? "text-amber-700"
                        : "text-sky-700",
                    )}
                  >
                    $
                    {total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* FOTO CON DISEÑO ENTERPRISE (Dropzone Area) */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <FileImage className="h-3.5 w-3.5" /> Comprobante
                    (Evidencia)
                  </Label>
                  <div className="relative group border-2 border-dashed border-slate-300 bg-white rounded-2xl p-6 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[130px] shadow-sm">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleFileChange}
                    />
                    {formData.evidencia ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-sm max-w-[250px] truncate">
                          {formData.evidencia.name}
                        </span>
                        <span className="text-[10px] text-emerald-600/70 uppercase font-bold">
                          Clic para cambiar archivo
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <Camera className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-bold">
                          Tomar foto o subir archivo
                        </span>
                        <span className="text-[10px] uppercase font-semibold">
                          Máximo 5MB (JPG, PNG)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONERA INFERIOR */}
          <div className="flex justify-end gap-4 pt-8 mt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 w-32 text-sm font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn(
                "h-12 px-8 text-sm font-black shadow-lg",
                formData.tipoCombustible === "diesel"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white",
              )}
            >
              <Upload className="h-4 w-4 mr-2" /> Guardar y Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
