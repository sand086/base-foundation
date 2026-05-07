import * as React from "react";
import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Fuel,
  Camera,
  CheckCircle2,
  Upload,
  MapPin,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { FUEL_CONFIG } from "../types";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useUnits } from "@/features/units/hooks/useUnits";

/** =========================
 * Types & Interfaces
 * ========================= */

interface SubTicket {
  id: string;
  fecha_hora: string;
  estacion: string;
  litros_diesel: number;
  precio_diesel: number;
  evidencia: File | null;
}

export interface TicketFormData {
  unit_id: string;
  operator_id: string;
  trip_leg_ids: string[];
  odometro: string | number;
  is_motogenerator: boolean;
  horometro: string | number | null;
  tickets: SubTicket[];
}

interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => void;
  initialData?: any;
}

// Catálogo de Estaciones Fijas
const ESTACIONES_CATALOGO = [
  "Estación de Servicio Rápidos 3T",
  "San Marcos",
  "BP",
  "Shell",
  "Pemex",
  "Mobil",
  "Oxxo Gas",
  "Repsol",
  "G500",
];

/** =========================
 * Custom Combobox para Estaciones (Permite texto libre)
 * ========================= */
function StationCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const isExactMatch = ESTACIONES_CATALOGO.some(
    (est) => est.toLowerCase() === inputValue.toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 px-3 bg-background text-xs font-bold shadow-sm"
        >
          <span className="truncate">{value || "Seleccione o escriba..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 rounded-xl shadow-xl"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Buscar o escribir nueva estación..."
            value={inputValue}
            onValueChange={setInputValue}
            className="text-xs"
          />
          <CommandList className="max-h-[200px] custom-scrollbar">
            <CommandEmpty className="py-3 text-center text-xs text-slate-500">
              No se encontraron coincidencias.
            </CommandEmpty>
            <CommandGroup>
              {ESTACIONES_CATALOGO.map((est) => (
                <CommandItem
                  key={est}
                  value={est}
                  onSelect={() => {
                    onChange(est);
                    setOpen(false);
                    setInputValue("");
                  }}
                  className="text-xs cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === est
                        ? "opacity-100 text-emerald-500"
                        : "opacity-0",
                    )}
                  />
                  {est}
                </CommandItem>
              ))}

              {inputValue.trim() !== "" && !isExactMatch && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => {
                    onChange(inputValue.trim());
                    setOpen(false);
                    setInputValue("");
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer border-t border-slate-100 dark:border-white/10 mt-1 pt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Usar "{inputValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** =========================
 * Multi-Select Component
 * ========================= */

function SearchableMultiSelect({
  items,
  selectedValues = [],
  onToggle,
  placeholder,
  disabled = false,
}: any) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    return items.filter((item: any) =>
      normalize(item.label).includes(normalize(searchQuery)),
    );
  }, [items, searchQuery]);

  return (
    <Popover open={!disabled && open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl px-3 text-left shadow-sm bg-card/85 text-foreground haptic-press",
            disabled && "opacity-50 cursor-not-allowed bg-slate-100",
            selectedValues.length > 0 &&
              "border-brand-navy ring-1 ring-brand-navy/20",
          )}
        >
          <span className="truncate text-[11px] font-bold uppercase tracking-widest">
            {selectedValues.length > 0
              ? `${selectedValues.length} tramos vinculados`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[400px] p-0 rounded-2xl shadow-2xl border-border bg-card/95"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar unidad o viaje..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-12 text-xs"
          />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {filteredItems.length === 0 ? (
              <CommandEmpty className="p-4 text-xs font-bold text-center">
                No encontrado.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item: any) => {
                  const isSelected = selectedValues.includes(item.value);
                  return (
                    <CommandItem
                      key={item.value}
                      onSelect={() => {
                        onToggle(item.value);
                        setSearchQuery("");
                      }}
                      className="cursor-pointer py-3 border-b border-slate-100 dark:border-white/5"
                    >
                      <div
                        className={cn(
                          "mr-3 flex h-5 w-5 items-center justify-center rounded-md border",
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300",
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 stroke-[3px]" />
                        )}
                      </div>
                      <span className="font-bold text-[11px] uppercase tracking-wide">
                        {item.label}
                      </span>
                    </CommandItem>
                  );
                })}
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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** =========================
 * Main Modal Component
 * ========================= */

export function AddTicketModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddTicketModalProps) {
  const { trips = [] } = useTrips();
  const { unidades, fetchLastOdometer } = useUnits();

  // Estados de vinculación
  const [parentData, setParentData] = useState({
    unit_id: "",
    operator_id: "",
    selected_legs: [] as string[],
    odometro: "" as string | number,
  });

  const [isMotogenerator, setIsMotogenerator] = useState(false);
  const [lastOdoCache, setLastOdoCache] = useState<number>(0);

  const [tickets, setTickets] = useState<SubTicket[]>([
    {
      id: crypto.randomUUID(),
      fecha_hora: toDatetimeLocalValue(new Date()),
      estacion: "Estación de Servicio Rápidos 3T",
      litros_diesel: 0,
      precio_diesel: FUEL_CONFIG.PRECIOS_PROMEDIO.diesel,
      evidencia: null,
    },
  ]);

  const addSubTicket = () => {
    const lastTicket = tickets[tickets.length - 1];
    setTickets([
      ...tickets,
      {
        id: crypto.randomUUID(),
        fecha_hora: lastTicket?.fecha_hora || toDatetimeLocalValue(new Date()),
        estacion: lastTicket?.estacion || "Estación de Servicio Rápidos 3T",
        litros_diesel: 0,
        precio_diesel:
          lastTicket?.precio_diesel || FUEL_CONFIG.PRECIOS_PROMEDIO.diesel,
        evidencia: null,
      },
    ]);
  };

  const removeSubTicket = (id: string) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter((t) => t.id !== id));
    }
  };

  const updateSubTicket = (id: string, field: keyof SubTicket, value: any) => {
    setTickets(
      tickets.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const activeTrips = useMemo(
    () =>
      (trips as any[]).filter((t) => {
        const status = String(t.status ?? "").toLowerCase();
        return ["entregado", "en_transito", "cerrado", "liquidado"].includes(
          status,
        );
      }),
    [trips],
  );

  // --- FASE 2: RESOLUCIÓN ESTRICTA DE MOTOGENERADORES ---
  const arrUnidades = useMemo(
    () => (Array.isArray(unidades) ? unidades : []),
    [unidades],
  );

  const resolveMotogenerator = (id: any, fallbackStr: any) => {
    let foundUnit = null;

    // 1. Buscar si el ID real existe en BD
    if (id && !isNaN(Number(id))) {
      foundUnit = arrUnidades.find((u: any) => String(u.id) === String(id));
    }

    // 2. Si el texto escondido es en realidad el ID (ej: "26")
    if (!foundUnit && fallbackStr && !isNaN(Number(fallbackStr))) {
      foundUnit = arrUnidades.find(
        (u: any) => String(u.id) === String(fallbackStr),
      );
    }

    // 3. Buscar si el string quemado coincide con algún número económico de la BD (ej: "M10")
    if (!foundUnit && fallbackStr) {
      foundUnit = arrUnidades.find(
        (u: any) =>
          String(u.numero_economico).toLowerCase() ===
          String(fallbackStr).toLowerCase().trim(),
      );
    }

    if (foundUnit) {
      return { id: foundUnit.id, name: foundUnit.numero_economico };
    }

    // QUIRÚRGICO: Si no se encontró en 'unidades', de todas formas devuelve el ID y un nombre fallback
    return {
      id: id || null,
      name: fallbackStr || (id ? `ID-${id}` : "Desconocido"),
    };
  };

  const searchableTrips = useMemo(() => {
    const list = activeTrips.flatMap((t) => {
      const validLegs = (t.legs || []).filter((leg: any) => {
        const legStatus = String(leg.status ?? "").toLowerCase();
        return ["entregado", "cerrado", "liquidado"].includes(legStatus);
      });

      const options: { label: string; value: string }[] = [];

      validLegs.forEach((leg: any) => {
        if (isMotogenerator) {
          // REGLA DE NEGOCIO: El motogenerador SOLO se alimenta en RUTA CARRETERA. No en patio.
          if (leg.leg_type !== "ruta_carretera") return;

          // Filtramos solo viajes refrigerados
          if (!t.is_refrigerated_1 && !t.is_refrigerated_2) return;

          // AQUÍ LA MAGIA: Extraemos el número económico desde el objeto anidado `_unit`
          const mg1 = resolveMotogenerator(
            t.motogenerator_1_id,
            t.motogenerator_1_unit?.numero_economico || t.motogenerator_1,
          );
          const mg2 = resolveMotogenerator(
            t.motogenerator_2_id,
            t.motogenerator_2_unit?.numero_economico || t.motogenerator_2,
          );

          if (t.is_refrigerated_1 && mg1.id) {
            options.push({
              label: `Folio ${t.public_id || t.id} | RUTA CARRETERA | ⚡ ECO-${mg1.name}`,
              value: `${t.id}|${leg.id}|${mg1.id}|${leg.operator_id}`,
            });
          }

          if (t.is_refrigerated_2 && mg2.id) {
            options.push({
              label: `Folio ${t.public_id || t.id} | RUTA CARRETERA | ⚡ ECO-${mg2.name}`,
              value: `${t.id}|${leg.id}|${mg2.id}|${leg.operator_id}`,
            });
          }
        } else {
          // Tractocamión Normal (Cualquier fase es válida)
          options.push({
            label: `Folio ${t.public_id || t.id} | ${leg.leg_type?.replace("_", " ")} | Eco: ${leg.unit?.numero_economico}`,
            value: `${t.id}|${leg.id}|${leg.unit_id}|${leg.operator_id}`,
          });
        }
      });

      return options;
    });
    return list;
  }, [activeTrips, isMotogenerator, arrUnidades]);
  // --------------------------------------------------------

  const handleToggleLeg = (selectedValue: string) => {
    setParentData((prev) => {
      const isSelected = prev.selected_legs.includes(selectedValue);
      const newLegs = isSelected
        ? prev.selected_legs.filter((l) => l !== selectedValue)
        : [...prev.selected_legs, selectedValue];

      let newUnit = prev.unit_id;
      let newOp = prev.operator_id;

      if (newLegs.length > 0) {
        const [, , uid, oid] = newLegs[0].split("|");
        // Aseguramos de no meter basura (strings vacíos o nulls) en el unit_id
        newUnit = uid && uid !== "undefined" && uid !== "null" ? uid : "";
        newOp =
          oid && oid !== "undefined" && oid !== "null" ? oid : prev.operator_id;
      }

      return {
        ...prev,
        selected_legs: newLegs,
        unit_id: newUnit,
        operator_id: newOp,
      };
    });
  };

  useEffect(() => {
    if (
      parentData.unit_id &&
      parentData.unit_id !== "undefined" &&
      parentData.unit_id !== "null" &&
      parentData.unit_id !== ""
    ) {
      fetchLastOdometer(parentData.unit_id).then((km) => {
        setLastOdoCache(km);
        setParentData((prev) => {
          if (prev.odometro === km) return prev;
          return { ...prev, odometro: km };
        });
      });
    } else {
      setLastOdoCache(0);
    }
  }, [parentData.unit_id, fetchLastOdometer, isMotogenerator]);

  // Resetear la selección al cambiar el switch de motogenerador
  useEffect(() => {
    setParentData((prev) => ({
      ...prev,
      selected_legs: [],
      unit_id: "",
      operator_id: "",
      odometro: "",
    }));
  }, [isMotogenerator]);

  const totalGeneral = useMemo(
    () =>
      tickets.reduce((sum, t) => sum + t.litros_diesel * t.precio_diesel, 0),
    [tickets],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentData.selected_legs.length === 0)
      return toast.error("Selecciona al menos un viaje.");

    if (isMotogenerator && !parentData.unit_id) {
      return toast.error(
        "Error: Este viaje no tiene un motogenerador válido asignado en la Base de Datos.",
      );
    }

    if (tickets.some((t) => t.litros_diesel <= 0))
      return toast.error("Todos los tickets deben tener litros registrados.");
    if (tickets.some((t) => !t.estacion || t.estacion.trim() === ""))
      return toast.error("Debes indicar una estación para cada vale.");

    const legIds = parentData.selected_legs.map((val) => val.split("|")[1]);

    const finalData: TicketFormData = {
      ...parentData,
      trip_leg_ids: legIds,
      is_motogenerator: isMotogenerator,
      odometro: isMotogenerator ? 0 : parentData.odometro,
      horometro: isMotogenerator ? parentData.odometro : null,
      tickets,
    };

    onSubmit(finalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 gap-0 border-none shadow-2xl overflow-hidden animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-500/20">
                <Fuel className="h-6 w-6 text-brand-red drop-shadow-md" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Registro Multi-Ticket
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  Vincule el viaje y agregue todos los vales del operador
                </p>
              </div>
            </div>

            {/* SWITCH MOTOGENERADOR */}
            <div className="flex items-center gap-3 bg-muted/50 p-2 px-4 rounded-xl border border-border">
              <Zap
                className={cn(
                  "h-4 w-4",
                  isMotogenerator ? "text-amber-500" : "text-muted-foreground",
                )}
              />
              <div className="flex flex-col text-right">
                <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                  Carga Motogenerador
                </Label>
              </div>
              <Switch
                checked={isMotogenerator}
                onCheckedChange={setIsMotogenerator}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-muted/50 dark:bg-transparent">
            {/* 1. SECCIÓN VINCULACIÓN */}
            <section className="bg-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-white/10">
                <MapPin className="h-4 w-4 text-brand-navy" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                  1. Datos del Viaje y Unidad
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Vincular a Viajes / Fases
                  </Label>
                  <SearchableMultiSelect
                    items={searchableTrips}
                    selectedValues={parentData.selected_legs}
                    onToggle={handleToggleLeg}
                    placeholder={
                      isMotogenerator
                        ? "Selecciona viaje (Ruta) con Motogenerador..."
                        : "Selecciona uno o más movimientos..."
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {isMotogenerator
                      ? "Horómetro Actual (Horas)"
                      : "Odómetro Actual (Opcional)"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      className="h-11 font-mono"
                      value={parentData.odometro}
                      onChange={(e) =>
                        setParentData((p) => ({
                          ...p,
                          odometro: e.target.value,
                        }))
                      }
                    />
                    {lastOdoCache > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded shadow-sm border border-emerald-200 dark:border-emerald-900/50">
                        ANT: {lastOdoCache.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SECCIÓN MULTI-TICKET */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-brand-red" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                    2. Carga de Vales (Tickets)
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSubTicket}
                  className="rounded-full bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 h-9 font-bold"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Agregar otro ticket
                </Button>
              </div>

              <div className="space-y-4">
                {tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="relative group bg-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm animate-in fade-in slide-in-from-left-2"
                  >
                    {tickets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubTicket(ticket.id)}
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                      {/* SELECTOR DE ESTACIÓN MEJORADO */}
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Estación / Gasolinera
                        </Label>
                        <StationCombobox
                          value={ticket.estacion}
                          onChange={(val) =>
                            updateSubTicket(ticket.id, "estacion", val)
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Litros
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          className="font-mono"
                          value={ticket.litros_diesel || ""}
                          onChange={(e) =>
                            updateSubTicket(
                              ticket.id,
                              "litros_diesel",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Precio
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="font-mono"
                          value={ticket.precio_diesel || ""}
                          onChange={(e) =>
                            updateSubTicket(
                              ticket.id,
                              "precio_diesel",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Fecha/Hora
                        </Label>
                        <Input
                          type="datetime-local"
                          className="text-xs"
                          value={ticket.fecha_hora}
                          onChange={(e) =>
                            updateSubTicket(
                              ticket.id,
                              "fecha_hora",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Evidencia
                        </Label>
                        <div className="relative h-10 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg hover:border-brand-navy hover:bg-muted/50 transition-colors flex items-center justify-center overflow-hidden">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={(e) =>
                              updateSubTicket(
                                ticket.id,
                                "evidencia",
                                e.target.files?.[0] || null,
                              )
                            }
                          />
                          {ticket.evidencia ? (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-[10px] font-bold truncate max-w-[80px]">
                                {ticket.evidencia.name}
                              </span>
                            </div>
                          ) : (
                            <Camera className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* CAPA 5: FOOTER */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-200 dark:border-white/10 bg-muted/50 backdrop-blur-xl p-6 sm:p-8 z-10 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Inversión Total de Carga
              </span>
              <span className="text-3xl font-black font-mono text-foreground tracking-tighter">
                $
                {totalGeneral.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto haptic-press border-none text-white bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)] font-black uppercase tracking-widest text-[10px]"
              >
                <Upload className="mr-2 h-4 w-4" />
                Guardar {tickets.length} Vales
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
