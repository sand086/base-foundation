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
import { DatePicker } from "@/components/ui/date-picker";
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
  CalendarDays,
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
  initialData?: Partial<TicketFormData> & {
    unit_id?: string | number;
    operator_id?: string | number;
    trip_id?: string | number;
  };
}

interface ClientItem {
  id: string | number;
  razon_social?: string;
  nombre?: string;
  rfc?: string;
}

interface TripLegItem {
  status?: string;
  unit_id?: string | number;
  operator_id?: string | number;
}

interface TripItem {
  id: string | number;
  public_id?: string | number;
  status?: string;
  client_id?: string | number;
  origin?: string;
  destination?: string;
  start_date?: string;
  created_at?: string;
  client?: {
    razon_social?: string;
  };
  legs?: TripLegItem[];
}

interface UnitItem {
  id: string | number;
  numero_economico?: string | number;
  placas?: string;
  capacidad_tanque_diesel?: string | number;
  capacidad_tanque_urea?: string | number;
}

interface OperatorItem {
  id: string | number;
  name?: string;
  nombre?: string;
}

interface SearchableSelectItem {
  label: string;
  value: string;
}

/** =========================
 * Helpers
 * ========================= */

function SearchableSelect({
  items,
  value,
  onSelect,
  placeholder,
  emptyMessage = "No se encontraron coincidencias.",
}: {
  items: SearchableSelectItem[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = items.find((item) => item.value === value);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const normalizedSearch = normalize(searchQuery);

    return items.filter((item) =>
      normalize(item.label).includes(normalizedSearch),
    );
  }, [items, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 w-full justify-between rounded-2xl px-3 text-left shadow-sm",
            "border-white/60 bg-white/85 backdrop-blur-xl",
            "hover:bg-white dark:border-white/10 dark:bg-brand-navy/80 dark:hover:bg-brand-navy/90",
            "text-slate-800 dark:text-slate-100",
          )}
        >
          {selectedItem ? (
            <span className="truncate text-sm font-semibold">
              {selectedItem.label}
            </span>
          ) : (
            <span className="truncate text-sm text-slate-500 dark:text-slate-400">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          "z-[9999] w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl",
          "border border-slate-200/80 bg-white/95 backdrop-blur-xl",
          "dark:border-white/10 dark:bg-slate-950/95",
        )}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            placeholder="Escribe para buscar..."
            className="h-11 text-sm"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <CommandEmpty className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
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
                    className={cn(
                      "cursor-pointer py-3 text-sm",
                      "border-b border-slate-100 last:border-b-0",
                      "dark:border-white/5",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 shrink-0 text-emerald-600",
                        value === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate font-semibold">{item.label}</span>
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

function dateToYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ymdToDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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

function isValidDate(date?: Date) {
  return Boolean(date && !Number.isNaN(date.getTime()));
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

  const safeClients = Array.isArray(clients) ? (clients as ClientItem[]) : [];
  const safeTrips = Array.isArray(trips) ? (trips as TripItem[]) : [];
  const safeOperators = Array.isArray(operadores)
    ? (operadores as OperatorItem[])
    : [];
  const safeUnits = Array.isArray(unidades) ? (unidades as UnitItem[]) : [];

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
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      fecha_hora: toDatetimeLocalValue(new Date()),
    }));
  }, [open]);

  const selectedUnit = useMemo(() => {
    if (!formData.unit_id) return undefined;
    return safeUnits.find((u) => String(u.id) === formData.unit_id);
  }, [safeUnits, formData.unit_id]);

  const activeTrips = useMemo(() => {
    return safeTrips.filter(
      (t) => String(t.status ?? "").toLowerCase() !== "liquidado",
    );
  }, [safeTrips]);

  const availableClientsForFilter = useMemo(() => {
    const activeClientIds = new Set(
      activeTrips.map((t) => String(t.client_id ?? "")),
    );

    return safeClients
      .filter((c) => activeClientIds.has(String(c.id)))
      .sort((a, b) => {
        const nameA = a.razon_social || a.nombre || "";
        const nameB = b.razon_social || b.nombre || "";
        return nameA.localeCompare(nameB);
      });
  }, [activeTrips, safeClients]);

  const filteredTrips = useMemo(() => {
    return activeTrips.filter((t) => {
      const matchClient =
        filterClient === "ALL" || String(t.client_id) === filterClient;

      let matchDate = true;
      const tripDate = new Date(t.start_date || t.created_at || "");

      if (Number.isNaN(tripDate.getTime())) return matchClient;

      if (isValidDate(dateFrom)) {
        const from = new Date(dateFrom as Date);
        from.setHours(0, 0, 0, 0);
        if (tripDate < from) matchDate = false;
      }

      if (isValidDate(dateTo)) {
        const to = new Date(dateTo as Date);
        to.setHours(23, 59, 59, 999);
        if (tripDate > to) matchDate = false;
      }

      return matchClient && matchDate;
    });
  }, [activeTrips, filterClient, dateFrom, dateTo]);

  const searchableTrips = useMemo<SearchableSelectItem[]>(() => {
    const list = filteredTrips.map((t) => {
      const foundClient = safeClients.find(
        (c) => String(c.id) === String(t.client_id),
      );

      const clientName =
        foundClient?.razon_social ||
        t.client?.razon_social ||
        foundClient?.nombre ||
        "Sin Cliente";

      const rawDate = new Date(t.start_date || t.created_at || "");
      const dateStr = Number.isNaN(rawDate.getTime())
        ? "Sin fecha"
        : rawDate.toLocaleDateString("es-MX");

      return {
        label: `FOLIO ${t.public_id || t.id} | ${clientName} | ${t.origin || "S/O"} ➔ ${t.destination || "S/D"} | ${dateStr}`,
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
  }, [filteredTrips, safeClients]);

  const searchableUnits = useMemo<SearchableSelectItem[]>(() => {
    return safeUnits.map((u) => ({
      label: `ECO-${u.numero_economico ?? "S/N"} - ${u.placas || "S/P"}`,
      value: String(u.id),
    }));
  }, [safeUnits]);

  const searchableOperators = useMemo<SearchableSelectItem[]>(() => {
    return safeOperators.map((o) => ({
      label: o.name || o.nombre || `Operador #${o.id}`,
      value: String(o.id),
    }));
  }, [safeOperators]);

  const handleTripSelection = (selectedTripId: string) => {
    if (selectedTripId === "none") {
      setFormData((prev) => ({ ...prev, trip_id: "" }));
      return;
    }

    const tripObj = activeTrips.find((t) => String(t.id) === selectedTripId);

    if (tripObj) {
      const activeLeg =
        tripObj.legs?.find(
          (l) =>
            !["entregado", "cerrado", "liquidado"].includes(
              String(l.status ?? "").toLowerCase(),
            ),
        ) || tripObj.legs?.[tripObj.legs.length - 1];

      setFormData((prev) => ({
        ...prev,
        trip_id: selectedTripId,
        unit_id: activeLeg?.unit_id ? String(activeLeg.unit_id) : prev.unit_id,
        operator_id: activeLeg?.operator_id
          ? String(activeLeg.operator_id)
          : prev.operator_id,
      }));

      toast.success("Viaje vinculado", {
        description: "Se cargaron la unidad y el operador del viaje.",
      });
    } else {
      setFormData((prev) => ({ ...prev, trip_id: selectedTripId }));
    }
  };

  const capDiesel = selectedUnit?.capacidad_tanque_diesel
    ? Number(selectedUnit.capacidad_tanque_diesel)
    : FUEL_CONFIG.CAPACIDADES_DEFAULT.diesel;

  const capUrea = selectedUnit?.capacidad_tanque_urea
    ? Number(selectedUnit.capacidad_tanque_urea)
    : FUEL_CONFIG.CAPACIDADES_DEFAULT.urea;

  const isDieselOver =
    Boolean(selectedUnit) && formData.litros_diesel > capDiesel;
  const isUreaOver = Boolean(selectedUnit) && formData.litros_urea > capUrea;

  const total = useMemo(
    () =>
      (formData.litros_diesel || 0) * (formData.precio_diesel || 0) +
      (formData.litros_urea || 0) * (formData.precio_urea || 0),
    [formData],
  );

  const clearFilters = () => {
    setFilterClient("ALL");
    setDateFrom(undefined);
    setDateTo(undefined);
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
    if (formData.litros_diesel <= 0 && formData.litros_urea <= 0) {
      return "Debes registrar litros de diésel o de urea.";
    }
    if (isDieselOver) {
      return `Excede capacidad técnica de Diésel (${capDiesel}L).`;
    }
    if (isUreaOver) {
      return `Excede capacidad técnica de Urea (${capUrea}L).`;
    }
    if (formData.evidencia && !clampFileSize(formData.evidencia, 5)) {
      return "El archivo de imagen excede los 5MB.";
    }
    return null;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error("Datos incompletos", { description: error });
      return;
    }

    const finalData: TicketFormData = {
      ...formData,
      odometro: safeInt(String(formData.odometro), 0),
    };

    onSubmit(finalData);

    toast.success("Carga preparada", {
      description: "Ticket de combustible preparado para registro.",
    });

    resetForm();
    onOpenChange(false);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setFormData((prev) => ({ ...prev, evidencia: null }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Formato inválido", {
        description: "Por favor suba una fotografía JPG o PNG.",
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

    setFormData((prev) => ({ ...prev, evidencia: file }));
  };

  useEffect(() => {
    if (!open || !initialData) return;

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
  }, [open, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-[28px] shadow-2xl",
          "bg-white/90 backdrop-blur-xl dark:bg-brand-navy/95",
        )}
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
          <DialogTitle className="flex items-start gap-4 text-left">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                "bg-brand-red/10 text-brand-red dark:bg-brand-red/15",
              )}
            >
              <Fuel className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="heading-crisp text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Registro de vale de combustible
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Capture los datos del ticket. Puede registrar diésel, urea o
                ambos en un solo paso.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* LADO IZQUIERDO */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-navy/10 shadow-inner dark:bg-white/10">
                    <MapPin className="h-4 w-4 text-brand-navy dark:text-slate-200" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                      1. Vinculación operativa
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Asocie el vale a un viaje activo o registre la carga de
                      forma local.
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-4 rounded-2xl border p-4 shadow-sm",
                    "border-blue-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      variant="brand"
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Asociar a un viaje activo
                    </Label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      <FilterX className="mr-1 h-3 w-3" />
                      Limpiar filtros
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        variant="brand"
                        className="text-[10px] font-black uppercase tracking-[0.2em]"
                      >
                        Cliente
                      </Label>
                      <Select
                        value={filterClient}
                        onValueChange={setFilterClient}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Todos..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">
                            Todos los clientes
                          </SelectItem>
                          {availableClientsForFilter.map((c) => (
                            <SelectItem key={String(c.id)} value={String(c.id)}>
                              {c.razon_social || c.rfc || `Cliente #${c.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        variant="brand"
                        className="text-[10px] font-black uppercase tracking-[0.2em]"
                      >
                        Rango de fechas
                      </Label>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <DatePicker
                          date={dateFrom}
                          onDateChange={setDateFrom}
                        />
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          —
                        </span>
                        <DatePicker date={dateTo} onDateChange={setDateTo} />
                      </div>
                    </div>
                  </div>

                  <SearchableSelect
                    items={searchableTrips}
                    value={formData.trip_id}
                    onSelect={handleTripSelection}
                    placeholder="Escriba folio, cliente o ruta..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      variant="brand"
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Unidad *
                    </Label>
                    <SearchableSelect
                      items={searchableUnits}
                      value={formData.unit_id}
                      onSelect={(value) =>
                        setFormData((prev) => ({ ...prev, unit_id: value }))
                      }
                      placeholder="Buscar unidad..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      variant="brand"
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      <User className="h-3.5 w-3.5" />
                      Operador *
                    </Label>
                    <SearchableSelect
                      items={searchableOperators}
                      value={formData.operator_id}
                      onSelect={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          operator_id: value,
                        }))
                      }
                      placeholder="Buscar operador..."
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label
                    variant="brand"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    Lectura de odómetro (km)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Opcional. Ej: 245890"
                    value={formData.odometro}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        odometro: e.target.value,
                      }))
                    }
                    className="h-11 font-mono text-sm"
                  />
                </div>
              </div>
            </section>

            {/* LADO DERECHO */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-red/10 shadow-inner dark:bg-brand-red/15">
                    <Fuel className="h-4 w-4 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                      2. Carga física y evidencia
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Registre importes, litros, estación y archivo de respaldo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      variant="brand"
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Fecha y hora *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={formData.fecha_hora}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fecha_hora: e.target.value,
                        }))
                      }
                      className="h-11 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      variant="brand"
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Estación
                    </Label>
                    <Input
                      placeholder="Ej: Parador San Marcos"
                      value={formData.estacion}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          estacion: e.target.value,
                        }))
                      }
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* DIESEL */}
                  <div
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm",
                      "border-amber-200 bg-amber-50/90",
                      "dark:border-amber-500/20 dark:bg-amber-500/10",
                    )}
                  >
                    <div className="mb-4 flex items-center gap-2 border-b border-amber-200/60 pb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:border-amber-400/10 dark:text-amber-300">
                      <Fuel className="h-4 w-4" />
                      Diésel
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          variant="brand"
                          className="text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                          Litros
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={formData.litros_diesel || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              litros_diesel: safeNumber(e.target.value),
                            }))
                          }
                          className={cn(
                            "h-11 font-mono",
                            isDieselOver &&
                              "border-red-500 ring-1 ring-red-500/70",
                          )}
                        />
                        {isDieselOver && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            Excede la capacidad técnica de diésel: {capDiesel}L
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          variant="brand"
                          className="text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                          Precio x litro
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.precio_diesel || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              precio_diesel: safeNumber(e.target.value),
                            }))
                          }
                          className="h-11 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* UREA */}
                  <div
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm",
                      "border-sky-200 bg-sky-50/90",
                      "dark:border-sky-500/20 dark:bg-sky-500/10",
                    )}
                  >
                    <div className="mb-4 flex items-center gap-2 border-b border-sky-200/60 pb-2 text-xs font-black uppercase tracking-[0.2em] text-sky-700 dark:border-sky-400/10 dark:text-sky-300">
                      <Droplets className="h-4 w-4" />
                      Urea (DEF)
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          variant="brand"
                          className="text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                          Litros
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={formData.litros_urea || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              litros_urea: safeNumber(e.target.value),
                            }))
                          }
                          className={cn(
                            "h-11 font-mono",
                            isUreaOver &&
                              "border-red-500 ring-1 ring-red-500/70",
                          )}
                        />
                        {isUreaOver && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            Excede la capacidad técnica de urea: {capUrea}L
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          variant="brand"
                          className="text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                          Precio x litro
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.precio_urea || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              precio_urea: safeNumber(e.target.value),
                            }))
                          }
                          className="h-11 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-2 flex items-center justify-between rounded-2xl border p-4 shadow-inner",
                    "border-slate-700 bg-slate-900 text-white",
                    "dark:border-white/10 dark:bg-slate-950",
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    Costo total del vale
                  </span>
                  <span className="font-mono text-2xl font-black tracking-tighter text-emerald-400">
                    $
                    {total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <Label
                    variant="brand"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    <FileImage className="h-3.5 w-3.5" />
                    Comprobante (evidencia)
                  </Label>

                  <div
                    className={cn(
                      "relative min-h-[120px] rounded-2xl border-2 border-dashed p-6 shadow-sm transition-all",
                      "border-slate-300 bg-white/80 hover:border-blue-300 hover:bg-blue-50/40",
                      "dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-blue-400/40 dark:hover:bg-slate-900/60",
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      onChange={handleFileChange}
                    />

                    {formData.evidencia ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-7 w-7" />
                        <span className="max-w-[260px] truncate text-sm font-bold">
                          {formData.evidencia.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-600 dark:text-slate-300">
                        <Camera className="h-7 w-7" />
                        <span className="text-sm font-bold">
                          Tomar foto o subir archivo
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          JPG o PNG, máximo 5MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 flex justify-end gap-4 border-t border-slate-200 pt-6 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 min-w-32 font-bold"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="default"
              className="h-12 px-8 font-black"
            >
              <Upload className="mr-2 h-4 w-4" />
              Guardar vales
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
