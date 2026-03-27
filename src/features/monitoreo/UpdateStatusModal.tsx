// src/features/monitoreo/UpdateStatusModal.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  MapPin,
  Search,
  Navigation,
  MessageSquare,
  AlertTriangle,
  Edit2,
  Check,
  ChevronsUpDown,
  Gauge,
  Droplet,
  History,
  Bookmark,
  Compass,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TripLeg, TripTimelineEvent } from "@/types/api.types";
import { useSecurityNotifications } from "@/hooks/useSecurityNotifications";
import { geoapifyService } from "@/services/geoapifyService";

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  activeLeg?: TripLeg;
  onSubmit: (data: StatusUpdateData) => void;
  eventToEdit?: TripTimelineEvent | null; // 🚀 Prop para el modo edición
}

export interface StatusUpdateData {
  status: string;
  location: string;
  lat?: string;
  lng?: string;
  comments: string;
  notifyClient: boolean;
  timestamp: string;
  odometro?: string;
  combustible_porcentaje?: string;
  combustible_litros?: string;
}

const DEFAULT_LOCATIONS = [
  "Patio Base Veracruz",
  "Aduana / Puerto Veracruz",
  "Caseta San Marcos",
  "Caseta San Martín Texmelucan",
  "Caseta Amozoc",
  "Caseta Esperanza",
  "Caseta Cuitláhuac",
  "Caseta Fortín",
  "Caseta Paso del Toro",
  "Arco Norte",
  "Circuito Exterior Mexiquense",
  "Patio Destino CDMX",
  "Patio Destino Monterrey",
  "Patio Destino Guadalajara",
];

interface CachedLocation {
  address: string;
  lat: string;
  lng: string;
}

export function UpdateStatusModal({
  open,
  onOpenChange,
  serviceId,
  activeLeg,
  onSubmit,
  eventToEdit,
}: UpdateStatusModalProps) {
  const { sendSecurityNotification } = useSecurityNotifications();

  const [customLocations, setCustomLocations] = useState<CachedLocation[]>([]);
  const [geoapifyResults, setGeoapifyResults] = useState<any[]>([]);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);

  const [formData, setFormData] = useState<StatusUpdateData>({
    status: "en_transito", // 🚀 Predeterminado: Reporte Normal
    location: "",
    lat: "",
    lng: "",
    comments: "",
    notifyClient: false,
    timestamp: "",
    odometro: "",
    combustible_porcentaje: "",
    combustible_litros: "",
  });

  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState("");

  // Manejo de carga inicial (Edición vs Creación)
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("tracking_custom_locations_v2");
      if (saved) setCustomLocations(JSON.parse(saved));

      if (eventToEdit) {
        // 🧠 Lógica de limpieza para registros antiguos
        let cleanLocation = eventToEdit.location || "";

        // Si la localización es nula, intentamos limpiar el campo 'event'
        if (!cleanLocation && eventToEdit.event) {
          // Quitamos la frase "Estatus actualizado a [Estado] en "
          cleanLocation = eventToEdit.event.replace(
            /Estatus actualizado a .* en /i,
            "",
          );
        }

        const rawStatus = eventToEdit.event_type;
        const uiStatus = ["checkpoint", "status_change", "info"].includes(
          rawStatus,
        )
          ? "en_transito"
          : rawStatus;

        setFormData({
          status: uiStatus || "en_transito",
          location: cleanLocation,
          lat: eventToEdit.lat || "",
          lng: eventToEdit.lng || "",
          comments: eventToEdit.comments || "",
          notifyClient: false,
          timestamp: eventToEdit.time,
          odometro: "",
          combustible_porcentaje: "",
          combustible_litros: "",
        });
      } else {
        // MODO CREACIÓN
        setFormData({
          status: "en_transito",
          location: "",
          lat: "",
          lng: "",
          comments: "",
          notifyClient: false,
          timestamp: "",
          odometro: "",
          combustible_porcentaje: "",
          combustible_litros: "",
        });
      }
      setSearchLocationQuery("");
      setGeoapifyResults([]);
    }
  }, [open, eventToEdit]);
  // Buscador Geoapify con Debounce
  useEffect(() => {
    if (!searchLocationQuery || searchLocationQuery.length < 3) {
      setGeoapifyResults([]);
      setIsSearchingGeo(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingGeo(true);
      const features = await geoapifyService.autocomplete(searchLocationQuery);
      setGeoapifyResults(features);
      setIsSearchingGeo(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchLocationQuery]);

  const statusOptions = useMemo(
    () => [
      {
        value: "en_transito",
        label: "📍 Reporte de Posición (Normal)",
        color: "bg-blue-500",
      },
      {
        value: "entregado",
        label: "🏁 Arribo a Destino / Entregado",
        color: "bg-emerald-500",
      },
      {
        value: "detenido_descanso",
        label: "🛑 Detención para Descanso / Alimentos",
        color: "bg-sky-500",
      },
      {
        value: "retraso",
        label: "🚦 Tráfico / Retraso Operativo",
        color: "bg-amber-500",
      },
      {
        value: "revision_autoridad",
        label: "👮 Revisión de Autoridad (Retén/Báscula)",
        color: "bg-orange-500",
      },
      {
        value: "incidencia",
        label: "⚠️ Incidencia en Ruta (Falla Mecánica)",
        color: "bg-red-500",
      },
      {
        value: "accidente",
        label: "🚨 Accidente / Siniestro Mayor",
        color: "bg-red-800",
      },
    ],
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();

    let dbStatus = formData.status;
    const finalComments = formData.comments;

    // Normalización de estados para la DB
    if (
      ["detenido_descanso", "revision_autoridad", "incidencia"].includes(
        formData.status,
      )
    ) {
      dbStatus = "detenido";
    }

    const isIncident = [
      "detenido",
      "retraso",
      "accidente",
      "incidencia",
      "revision_autoridad",
    ].includes(formData.status);

    if (isIncident && !eventToEdit) {
      sendSecurityNotification({
        event:
          formData.status === "accidente" ? "trip_incident" : "trip_stopped",
        details: {
          tripId: serviceId,
          reason: finalComments || "Sin comentarios detallados",
          userName: "Monitorista",
        },
      });
    }

    // Guardar en Caché Local si es un lugar nuevo y tiene coordenadas
    const cleanLocation = formData.location.trim();
    if (
      cleanLocation &&
      !DEFAULT_LOCATIONS.includes(cleanLocation) &&
      formData.lat
    ) {
      const exists = customLocations.some((c) => c.address === cleanLocation);
      if (!exists) {
        const newLocation: CachedLocation = {
          address: cleanLocation,
          lat: formData.lat || "",
          lng: formData.lng || "",
        };
        const updatedLocations = [newLocation, ...customLocations].slice(0, 20);
        setCustomLocations(updatedLocations);
        localStorage.setItem(
          "tracking_custom_locations_v2",
          JSON.stringify(updatedLocations),
        );
      }
    }

    onSubmit({
      ...formData,
      status: dbStatus,
      timestamp: eventToEdit ? formData.timestamp : timestamp,
    });
  };

  const selectedStatus = statusOptions.find((s) => s.value === formData.status);
  const isIncidentUI = [
    "detenido_descanso",
    "retraso",
    "accidente",
    "incidencia",
    "revision_autoridad",
  ].includes(formData.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
        <div className="bg-slate-50 border-b border-slate-100 p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy font-black text-xl">
            {eventToEdit ? (
              <Edit2 className="h-5 w-5 text-amber-500" />
            ) : (
              <Navigation className="h-5 w-5 text-blue-600" />
            )}
            {eventToEdit ? "Corregir Reporte" : "Registrar Novedad"}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500 mt-1.5">
            Viaje <strong>#{serviceId}</strong> —{" "}
            {eventToEdit
              ? "Editando registro histórico"
              : "Actualizando posición actual"}
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-white">
          {/* TIPO DE EVENTO */}
          <div className="space-y-2">
            <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5" /> Motivo de Actualización *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              required
            >
              <SelectTrigger
                className={cn(
                  "h-12 border-2 font-bold transition-colors",
                  isIncidentUI
                    ? "border-red-200 bg-red-50/30"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <SelectValue placeholder="Selecciona el motivo...">
                  {selectedStatus && (
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-sm",
                          selectedStatus.color,
                        )}
                      />
                      <span
                        className={
                          isIncidentUI ? "text-red-700" : "text-slate-700"
                        }
                      >
                        {selectedStatus.label}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                {statusOptions.map((status) => (
                  <SelectItem
                    key={status.value}
                    value={status.value}
                    className="font-medium py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-sm",
                          status.color,
                        )}
                      />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* UBICACIÓN CON GEOAPIFY */}
          <div className="space-y-3 border border-slate-100 bg-slate-50/30 p-3 rounded-xl">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Ubicación o Referencia *
              </Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between h-11 font-medium border-2 hover:bg-slate-50 transition-colors overflow-hidden",
                      formData.location
                        ? "border-brand-navy/30 bg-blue-50/20 text-brand-navy font-bold"
                        : "border-slate-200 text-slate-500 bg-white",
                    )}
                  >
                    {/* 🚀 EL TRUCO ESTÁ EN ESTE SPAN: max-width evita que empuje el botón hacia afuera */}
                    <span className="truncate flex-1 text-left mr-2 max-w-[380px]">
                      {formData.location ||
                        "Busca una caseta, ciudad o bodega..."}
                    </span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-0 rounded-xl overflow-hidden border-slate-200 shadow-xl"
                  align="start"
                >
                  <Command>
                    <div className="relative border-b">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                      <CommandInput
                        placeholder="Escribe para buscar en el mapa..."
                        value={searchLocationQuery}
                        onValueChange={setSearchLocationQuery}
                        className="h-11 pl-9 border-0 focus:ring-0"
                      />
                      {isSearchingGeo && (
                        <Loader2 className="absolute right-3 top-3.5 h-4 w-4 text-blue-500 animate-spin" />
                      )}
                    </div>

                    <CommandList className="max-h-[300px]">
                      {/* RESULTADOS DE GEOAPIFY */}
                      {geoapifyResults.length > 0 && (
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <MapPin className="h-3.5 w-3.5" /> Resultados del
                              Mapa
                            </div>
                          }
                        >
                          {geoapifyResults.map(
                            (feature: any, index: number) => {
                              const addr = feature.properties.formatted;
                              return (
                                <CommandItem
                                  key={`geo-${index}`}
                                  onSelect={() => {
                                    setFormData({
                                      ...formData,
                                      location: addr,
                                      lat: String(feature.properties.lat),
                                      lng: String(feature.properties.lon),
                                    });
                                    setSearchLocationQuery("");
                                    setOpenCombobox(false);
                                  }}
                                  className="cursor-pointer py-2.5 border-b border-slate-50 last:border-0"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 text-sm">
                                      {feature.properties.address_line1 || addr}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {feature.properties.address_line2 ||
                                        "Dirección verificada"}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            },
                          )}
                        </CommandGroup>
                      )}

                      <CommandEmpty className="p-3">
                        <Button
                          type="button"
                          className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm font-bold h-11"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              location: searchLocationQuery,
                              lat: "",
                              lng: "",
                            });
                            setOpenCombobox(false);
                          }}
                        >
                          Usar texto libre: "{searchLocationQuery}"
                        </Button>
                      </CommandEmpty>

                      {/* HISTORIAL */}
                      {customLocations.length > 0 && !searchLocationQuery && (
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <History className="h-3.5 w-3.5" /> Historial
                              Reciente
                            </div>
                          }
                        >
                          {customLocations.map((loc) => (
                            <CommandItem
                              key={`custom-${loc.address}`}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  location: loc.address,
                                  lat: loc.lat,
                                  lng: loc.lng,
                                });
                                setOpenCombobox(false);
                              }}
                              className="cursor-pointer py-2.5"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-blue-600",
                                  formData.location === loc.address
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {loc.address}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* POR DEFECTO */}
                      {!searchLocationQuery && (
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-1.5">
                              <Bookmark className="h-3.5 w-3.5" /> Puntos de
                              Control SCT
                            </div>
                          }
                        >
                          {DEFAULT_LOCATIONS.map((loc) => (
                            <CommandItem
                              key={`default-${loc}`}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  location: loc,
                                  lat: "",
                                  lng: "",
                                });
                                setOpenCombobox(false);
                              }}
                              className="cursor-pointer py-2.5 text-slate-600"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-blue-600",
                                  formData.location === loc
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {loc}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* COORDENADAS GPS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Compass className="h-3 w-3" /> Latitud
                </Label>
                <Input
                  placeholder="19.4326"
                  className="h-9 font-mono text-sm bg-white border-slate-200"
                  value={formData.lat}
                  onChange={(e) =>
                    setFormData({ ...formData, lat: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Compass className="h-3 w-3" /> Longitud
                </Label>
                <Input
                  placeholder="-99.1332"
                  className="h-9 font-mono text-sm bg-white border-slate-200"
                  value={formData.lng}
                  onChange={(e) =>
                    setFormData({ ...formData, lng: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* TELEMETRÍA (Oculta en modo edición para no sobreescribir datos globales por error) */}
          {!eventToEdit && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl mt-2">
              <div className="col-span-3 pb-2 border-b border-slate-200/60 mb-1">
                <Label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-between">
                  Telemetría{" "}
                  <span className="font-normal text-[9px] text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100 italic">
                    Actualización de Unidad
                  </span>
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-slate-600" /> Odómetro
                </Label>
                <Input
                  type="number"
                  placeholder="Km"
                  className="h-10 font-mono text-sm bg-white border-slate-200"
                  value={formData.odometro}
                  onChange={(e) =>
                    setFormData({ ...formData, odometro: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Droplet className="h-3.5 w-3.5 text-blue-500" /> Diesel %
                </Label>
                <Input
                  type="number"
                  max="100"
                  placeholder="%"
                  className="h-10 font-mono text-sm bg-white border-slate-200"
                  value={formData.combustible_porcentaje}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      combustible_porcentaje: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Droplet className="h-3.5 w-3.5 text-cyan-500" /> Lts
                </Label>
                <Input
                  type="number"
                  placeholder="Lts"
                  className="h-10 font-mono text-sm bg-white border-slate-200"
                  value={formData.combustible_litros}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      combustible_litros: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* COMENTARIOS */}
          <div className="space-y-2 mt-2">
            <Label className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Detalles / Novedades{" "}
              {isIncidentUI && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              placeholder="Escribe notas adicionales sobre este reporte..."
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={2}
              className={cn(
                "resize-none bg-slate-50 focus:bg-white transition-colors",
                isIncidentUI
                  ? "border-red-300 focus-visible:ring-red-200"
                  : "border-slate-200",
              )}
              required={isIncidentUI}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 pb-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 font-bold text-slate-600 hover:bg-slate-100 px-6"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn(
                "h-11 px-8 font-black shadow-lg transition-all active:scale-95",
                isIncidentUI
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-brand-navy hover:bg-brand-navy/90 text-white",
              )}
              disabled={
                !formData.status ||
                !formData.location ||
                (isIncidentUI && !formData.comments)
              }
            >
              {eventToEdit
                ? "Guardar Cambios"
                : isIncidentUI
                  ? "Reportar Incidencia"
                  : "Guardar Reporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
