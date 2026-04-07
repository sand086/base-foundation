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
  MapPin,
  ChevronsUpDown,
  Check,
  Gauge,
  User,
  Truck,
  FileImage,
  CalendarDays,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { FUEL_CONFIG } from "../types";
import { useClients } from "@/features/clients/hooks/useClients";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useOperators } from "@/features/operators/hooks/useOperators";
import { useUnits } from "@/features/units/hooks/useUnits";

/** =========================
 * Types
 * ========================= */

// Estructura de cada ticket individual dentro del modal
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
  trip_id: string;
  trip_leg_id?: string | null;
  odometro: string | number;
  tickets: SubTicket[]; //  Actualizado para soportar múltiples
}

interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void; // Recibe el array de tickets para procesar
  initialData?: any;
}

/** =========================
 * Helpers
 * ========================= */

function SearchableSelect({
  items,
  value,
  onSelect,
  placeholder,
  disabled = false,
}: any) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedItem = items.find((item: any) => item.value === value);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const normalizedSearch = normalize(searchQuery);
    return items.filter((item: any) =>
      normalize(item.label).includes(normalizedSearch),
    );
  }, [items, searchQuery]);

  return (
    <Popover open={!disabled && open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-2xl px-3 text-left shadow-sm border-border bg-card/85 backdrop-blur-xl hover:bg-white text-foreground",
            disabled && "opacity-50 cursor-not-allowed bg-slate-100",
          )}
        >
          <span className="truncate text-sm font-semibold">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border border-border bg-card/95 dark:bg-card/95"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar..."
            className="h-11"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <CommandEmpty className="p-4 text-sm text-muted-foreground">
                Sin coincidencias.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item: any) => (
                  <CommandItem
                    key={item.value}
                    onSelect={() => {
                      onSelect(item.value);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer py-3 text-sm border-b border-slate-100"
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 text-emerald-600",
                        value === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-semibold">{item.label}</span>
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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AddTicketModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddTicketModalProps) {
  const { clients = [] } = useClients();
  const { trips = [] } = useTrips();
  const { operadores = [] } = useOperators();
  const { unidades = [] } = useUnits();

  // Estados de vinculación (Padre)
  const [parentData, setParentData] = useState({
    unit_id: "",
    operator_id: "",
    trip_id: "",
    trip_leg_id: null as string | null,
    odometro: "" as string | number,
  });

  //  REGLA GUSTAVO: Lista de tickets dinámicos
  const [tickets, setTickets] = useState<SubTicket[]>([
    {
      id: crypto.randomUUID(),
      fecha_hora: toDatetimeLocalValue(new Date()),
      estacion: "",
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
        //  HERENCIA: Jala datos del ticket anterior
        fecha_hora: lastTicket?.fecha_hora || toDatetimeLocalValue(new Date()),
        estacion: lastTicket?.estacion || "",
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
      (trips as any[]).filter(
        (t) => String(t.status ?? "").toLowerCase() !== "liquidado",
      ),
    [trips],
  );

  const searchableTrips = useMemo(() => {
    const list = activeTrips.flatMap((t) => {
      const clientName = t.client?.razon_social || "Sin Cliente";
      return (t.legs || []).map((leg: any) => ({
        label: `Folio ${t.public_id || t.id} | Fase: ${leg.leg_type?.replace("_", " ").toUpperCase()} | Eco: ${leg.unit?.numero_economico} | Op: ${leg.operator?.name}`,
        value: `${t.id}|${leg.id}`,
      }));
    });
    return [
      { label: "Carga Local / Patio (Sin Viaje)", value: "none|none" },
      ...list,
    ];
  }, [activeTrips]);

  const handleTripSelection = (selectedValue: string) => {
    if (selectedValue === "none|none") {
      setParentData((prev) => ({
        ...prev,
        trip_id: "none",
        trip_leg_id: null,
      }));
      return;
    }
    const [tId, lId] = selectedValue.split("|");
    const tripObj = activeTrips.find((t) => String(t.id) === tId);
    const legObj = tripObj?.legs?.find((l: any) => String(l.id) === lId);

    setParentData((prev) => ({
      ...prev,
      trip_id: tId,
      trip_leg_id: lId,
      unit_id: legObj?.unit_id ? String(legObj.unit_id) : prev.unit_id,
      operator_id: legObj?.operator_id
        ? String(legObj.operator_id)
        : prev.operator_id,
    }));
  };

  const totalGeneral = useMemo(
    () =>
      tickets.reduce((sum, t) => sum + t.litros_diesel * t.precio_diesel, 0),
    [tickets],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentData.unit_id) return toast.error("Selecciona una unidad.");

    // Validar que al menos un ticket tenga litros
    if (tickets.some((t) => t.litros_diesel <= 0)) {
      return toast.error("Todos los tickets deben tener litros registrados.");
    }

    // Enviamos los datos al padre (él se encarga de llamar al servicio N veces)
    onSubmit({
      ...parentData,
      tickets,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] flex flex-col p-0 gap-0 border-0 rounded-[28px] shadow-2xl overflow-hidden bg-background dark:bg-background">
        <DialogHeader className="shrink-0 border-b border-border bg-card p-6 shadow-sm">
          <DialogTitle className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
              <Fuel className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-foreground">
                Registro Multi-Ticket de Combustible
              </h2>
              <p className="text-sm text-muted-foreground">
                Vincule el viaje y agregue todos los vales que el operador
                presente.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* 1. SECCIÓN VINCULACIÓN */}
            <section className="bg-card p-6 rounded-[24px] border border-border shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b pb-3 border-border">
                <MapPin className="h-4 w-4 text-brand-navy" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                  1. Datos del Viaje y Unidad
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Buscador de Viaje / Fase
                  </Label>
                  <SearchableSelect
                    items={searchableTrips}
                    value={
                      parentData.trip_id === "none"
                        ? "none|none"
                        : `${parentData.trip_id}|${parentData.trip_leg_id || ""}`
                    }
                    onSelect={handleTripSelection}
                    placeholder="Escriba folio, cliente o unidad..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Odómetro Final (KM)
                  </Label>
                  <Input
                    type="number"
                    className="h-11 font-mono"
                    value={parentData.odometro}
                    onChange={(e) =>
                      setParentData((p) => ({ ...p, odometro: e.target.value }))
                    }
                  />
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
                {/*  BOTÓN MÁS: Agrega nuevo bloque de ticket */}
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
                    className="relative group bg-card p-5 rounded-[24px] border border-border shadow-sm animate-in fade-in slide-in-from-left-2"
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
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/80">
                          Estación / Gasolinera
                        </Label>
                        <Input
                          placeholder="Ej: San Marcos"
                          value={ticket.estacion}
                          onChange={(e) =>
                            updateSubTicket(
                              ticket.id,
                              "estacion",
                              e.target.value,
                            )
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
                        <div className="relative h-10 border-2 border-dashed border-slate-200 rounded-lg hover:border-brand-navy hover:bg-slate-50 transition-colors flex items-center justify-center overflow-hidden">
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

          {/* FOOTER FIJO CON TOTAL ACUMULADO */}
          <div className="shrink-0 flex items-center justify-between border-t bg-slate-100 p-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Inversión Total de Carga
              </span>
              <span className="text-3xl font-black font-mono text-foreground tracking-tighter">
                $
                {totalGeneral.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 font-bold px-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-12 px-10 font-black bg-brand-navy shadow-xl"
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
