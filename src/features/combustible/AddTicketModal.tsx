import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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

// 🚀 IMPORTAMOS CONFIGURACIONES REALES
import { FUEL_CONFIG } from "@/types/api.types";
import { useClients } from "@/hooks/useClients";
import { useTrips } from "@/hooks/useTrips";
import { useOperators } from "@/hooks/useOperators";
import { useUnits } from "@/hooks/useUnits";

/** =========================
 * Types
 * ========================= */

export interface TicketFormData {
  unit_id: string;
  operator_id: string;
  trip_id: string;
  fecha_hora: string;
  estacion: string;
  // 🚀 VARIABLES DEL VALE DOBLE
  litros_diesel: number;
  precio_diesel: number;
  litros_urea: number;
  precio_urea: number;
  odometro: string | number;
  evidencia: File | null;
}

interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => void;
  initialData?: any;
}

/** =========================
 * Helpers & Componentes
 * ========================= */

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
            <span className="text-slate-600">{placeholder}</span>
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

export function AddTicketModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddTicketModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { clients = [] } = useClients();
  const { trips = [] } = useTrips();
  const { operadores = [] } = useOperators();
  const { unidades = [] } = useUnits();

  // 🚀 ESTADO INICIAL VALE DOBLE
  const [formData, setFormData] = useState<TicketFormData>({
    unit_id: "",
    operator_id: "",
    trip_id: "",
    fecha_hora: toDatetimeLocalValue(new Date()),
    estacion: "",
    litros_diesel: 0,
    precio_diesel: FUEL_CONFIG.PRECIOS_PROMEDIO.diesel,
    litros_urea: 0,
    precio_urea: FUEL_CONFIG.PRECIOS_PROMEDIO.urea,
    odometro: "",
    evidencia: null,
  });

  const [filterClient, setFilterClient] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      fecha_hora: toDatetimeLocalValue(new Date()),
    }));
  }, [open]);

  const selectedUnit = useMemo(() => {
    if (!formData.unit_id || !Array.isArray(unidades)) return undefined;
    return unidades.find((u: any) => String(u.id) === formData.unit_id);
  }, [unidades, formData.unit_id]);

  const activeTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.filter(
      (t: any) => String(t.status).toLowerCase() !== "liquidado",
    );
  }, [trips]);

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

  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t: any) => {
      const matchClient =
        filterClient === "ALL" || String(t.client_id) === filterClient;
      let matchDate = true;
      const tripDate = new Date(t.start_date || t.created_at);

      if (dateFrom && tripDate < new Date(`${dateFrom}T00:00:00`))
        matchDate = false;
      if (dateTo && tripDate > new Date(`${dateTo}T23:59:59`))
        matchDate = false;

      return matchClient && matchDate;
    });
  }, [activeTrips, filterClient, dateFrom, dateTo]);

  const searchableTrips = useMemo(() => {
    const list = filteredTrips.map((t: any) => {
      const foundClient = Array.isArray(clients)
        ? clients.find((c: any) => String(c.id) === String(t.client_id))
        : null;
      const cName =
        foundClient?.razon_social || t.client?.razon_social || "Sin Cliente";
      const dateStr = new Date(t.start_date || t.created_at).toLocaleDateString(
        "es-MX",
      );
      return {
        label: `FOLIO ${t.public_id || t.id} | ${cName} | ${t.origin} ➔ ${t.destination} | ${dateStr}`,
        value: String(t.id),
      };
    });
    return [
      {
        label: "Carga Local / Pendiente de Asignar (Sin Viaje)",
        value: "none",
      },
      ...list,
    ];
  }, [filteredTrips, clients]);

  const searchableUnits = useMemo(() => {
    if (!Array.isArray(unidades)) return [];
    return unidades.map((u: any) => ({
      label: `ECO-${u.numero_economico} - ${u.placas || "S/P"}`,
      value: String(u.id),
    }));
  }, [unidades]);

  const searchableOperators = useMemo(() => {
    if (!Array.isArray(operadores)) return [];
    return operadores.map((o: any) => ({
      label: o.name || o.nombre || `Operador #${o.id}`,
      value: String(o.id),
    }));
  }, [operadores]);

  const handleTripSelection = (selectedTripId: string) => {
    if (selectedTripId === "none") {
      setFormData((prev) => ({ ...prev, trip_id: "" }));
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
        trip_id: selectedTripId,
        unit_id: activeLeg?.unit_id ? String(activeLeg.unit_id) : prev.unit_id,
        operator_id: activeLeg?.operator_id
          ? String(activeLeg.operator_id)
          : prev.operator_id,
      }));
      toast.success("Viaje Vinculado", {
        description: "Se han cargado la unidad y el operador del viaje.",
      });
    } else {
      setFormData((prev) => ({ ...prev, trip_id: selectedTripId }));
    }
  };

  // 🚀 CORRECCIÓN DEL ERROR DE TYPESCRIPT
  const capDiesel = selectedUnit?.capacidad_tanque_diesel
    ? Number(selectedUnit.capacidad_tanque_diesel)
    : FUEL_CONFIG.CAPACIDADES_DEFAULT.diesel;

  const capUrea = selectedUnit?.capacidad_tanque_urea
    ? Number(selectedUnit.capacidad_tanque_urea)
    : FUEL_CONFIG.CAPACIDADES_DEFAULT.urea;

  const isDieselOver =
    Boolean(selectedUnit) && formData.litros_diesel > capDiesel;
  const isUreaOver = Boolean(selectedUnit) && formData.litros_urea > capUrea;

  // Calculo de importe total
  const total = useMemo(
    () =>
      (formData.litros_diesel || 0) * (formData.precio_diesel || 0) +
      (formData.litros_urea || 0) * (formData.precio_urea || 0),
    [formData],
  );

  const clearFilters = () => {
    setFilterClient("ALL");
    setDateFrom("");
    setDateTo("");
    setFormData((prev) => ({ ...prev, trip_id: "" }));
  };

  const resetForm = () => {
    setFormData({
      unit_id: "",
      operator_id: "",
      trip_id: "",
      fecha_hora: toDatetimeLocalValue(new Date()),
      estacion: "",
      litros_diesel: 0,
      precio_diesel: FUEL_CONFIG.PRECIOS_PROMEDIO.diesel,
      litros_urea: 0,
      precio_urea: FUEL_CONFIG.PRECIOS_PROMEDIO.urea,
      odometro: "",
      evidencia: null,
    });
    clearFilters();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    if (!formData.unit_id) return "Selecciona una unidad.";
    if (!formData.operator_id) return "Selecciona un operador.";
    if (!formData.fecha_hora) return "Selecciona fecha y hora.";
    if (formData.litros_diesel <= 0 && formData.litros_urea <= 0)
      return "Debes registrar litros de diésel o de urea.";
    if (isDieselOver)
      return `Excede capacidad técnica de Diésel (${capDiesel}L).`;
    if (isUreaOver) return `Excede capacidad técnica de Urea (${capUrea}L).`;
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
    toast.success("Carga Preparada", {
      description: "Ticket de combustible preparado para registro.",
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

  useEffect(() => {
    if (open && initialData) {
      setFormData((prev) => ({
        ...prev,
        trip_id: initialData.trip_id ? String(initialData.trip_id) : "",
        unit_id: initialData.unit_id ? String(initialData.unit_id) : "",
        operator_id: initialData.operator_id
          ? String(initialData.operator_id)
          : "",
        litros_diesel: 0,
        precio_diesel: FUEL_CONFIG.PRECIOS_PROMEDIO.diesel,
        litros_urea: 0,
        precio_urea: FUEL_CONFIG.PRECIOS_PROMEDIO.urea,
        estacion: "",
        odometro: "",
        evidencia: null,
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-2xl bg-slate-50">
        <DialogHeader className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-3 text-slate-800 text-xl font-black">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner bg-blue-100">
              <Fuel className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              Registro de Vale de Combustible
              <p className="text-xs font-medium text-slate-500 mt-1 tracking-normal">
                Capture los datos del ticket. Puede registrar Diésel, Urea o
                ambos en un solo paso.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LADO IZQUIERDO: VINCULACIÓN OPERATIVA */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 border-b pb-2">
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
                        <span className="text-[10px] text-slate-600">-</span>
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
                    value={formData.trip_id}
                    onSelect={handleTripSelection}
                    placeholder="Escriba folio, ruta o seleccione..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" /> Unidad *
                    </Label>
                    <SearchableSelect
                      items={searchableUnits}
                      value={formData.unit_id}
                      onSelect={(value) =>
                        setFormData((p) => ({ ...p, unit_id: value }))
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
                      value={formData.operator_id}
                      onSelect={(value) =>
                        setFormData((p) => ({ ...p, operator_id: value }))
                      }
                      placeholder="Buscar operador..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" /> Lectura de Odómetro (Km)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Opcional. Ej: 245890"
                    value={formData.odometro}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, odometro: e.target.value }))
                    }
                    className="h-11 font-mono text-sm bg-white shadow-sm border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* LADO DERECHO: DATOS DEL TICKET */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 border-b pb-2">
                  <Fuel className="h-4 w-4 text-brand-navy" /> 2. Carga Física y
                  Evidencia
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Fecha y Hora *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={formData.fecha_hora}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          fecha_hora: e.target.value,
                        }))
                      }
                      className="h-11 text-sm bg-white shadow-sm border-slate-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                      Estación (Opcional)
                    </Label>
                    <Input
                      placeholder="Ej: Parador San Marcos"
                      value={formData.estacion}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, estacion: e.target.value }))
                      }
                      className="h-11 text-sm bg-white shadow-sm border-slate-300"
                    />
                  </div>
                </div>

                {/* 🚀 TARJETAS DE COMBUSTIBLE DOBLES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DIÉSEL */}
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm space-y-3">
                    <div className="font-black text-amber-700 flex items-center gap-1 uppercase tracking-widest text-xs border-b border-amber-200/50 pb-2">
                      <Fuel className="h-4 w-4" /> Diésel
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase">
                        Litros
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.litros_diesel || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            litros_diesel: safeNumber(e.target.value),
                          }))
                        }
                        className={cn(
                          "h-10 font-mono bg-white",
                          isDieselOver && "border-red-500 ring-1 ring-red-500",
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase">
                        Precio X Litro
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.precio_diesel || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            precio_diesel: safeNumber(e.target.value),
                          }))
                        }
                        className="h-10 font-mono bg-white"
                      />
                    </div>
                  </div>

                  {/* UREA */}
                  <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 shadow-sm space-y-3">
                    <div className="font-black text-sky-700 flex items-center gap-1 uppercase tracking-widest text-xs border-b border-sky-200/50 pb-2">
                      <Droplets className="h-4 w-4" /> Urea (DEF)
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase">
                        Litros
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.litros_urea || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            litros_urea: safeNumber(e.target.value),
                          }))
                        }
                        className={cn(
                          "h-10 font-mono bg-white",
                          isUreaOver && "border-red-500 ring-1 ring-red-500",
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase">
                        Precio X Litro
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.precio_urea || ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            precio_urea: safeNumber(e.target.value),
                          }))
                        }
                        className="h-10 font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-xl p-4 border flex justify-between items-center shadow-inner bg-slate-800 border-slate-700 text-white">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                    Costo Total del Vale
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tighter text-emerald-400">
                    $
                    {total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* EVIDENCIA */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <FileImage className="h-3.5 w-3.5" /> Comprobante
                    (Evidencia)
                  </Label>
                  <div className="relative group border-2 border-dashed border-slate-300 bg-white rounded-2xl p-6 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[100px] shadow-sm">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleFileChange}
                    />
                    {formData.evidencia ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="font-bold text-sm max-w-[250px] truncate">
                          {formData.evidencia.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-600 group-hover:text-blue-500 transition-colors">
                        <Camera className="h-6 w-6" />
                        <span className="text-sm font-bold">
                          Tomar foto o subir archivo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              className="h-12 px-8 text-sm font-black shadow-lg bg-brand-navy hover:bg-slate-800 text-white"
            >
              <Upload className="h-4 w-4 mr-2" /> Guardar Vales
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
