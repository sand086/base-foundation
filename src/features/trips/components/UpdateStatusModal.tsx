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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Trip,
  TripLeg,
  TripTimelineEvent,
  StatusUpdateData,
  CachedLocation,
  StatusOption,
} from "../types";
import { useSecurityNotifications } from "@/features/notifications/hooks/useSecurityNotifications"; // Ajustado a FSD
import { geoapifyService } from "@/features/trips/services/geoapifyService"; // Ajustado a FSD

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  trip?: Trip | null;
  activeLeg?: TripLeg;
  // FIX CRÍTICO 1: Permitir que onSubmit sea asíncrono (Promise) para esperar al backend
  onSubmit: (data: StatusUpdateData) => void | Promise<void> | Promise<string | number>;
  eventToEdit?: TripTimelineEvent | null; // Prop para el modo edición
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

export function UpdateStatusModal({
  open,
  onOpenChange,
  serviceId,
  trip,
  activeLeg,
  onSubmit,
  eventToEdit,
}: UpdateStatusModalProps) {
  const { sendSecurityNotification } = useSecurityNotifications();

  const [customLocations, setCustomLocations] = useState<CachedLocation[]>([]);
  const [geoapifyResults, setGeoapifyResults] = useState<any[]>([]);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<StatusUpdateData>({
    status: "en_transito", // Predeterminado: Reporte Normal
    location: "",
    lat: "",
    lng: "",
    comments: "",
    notifyClient: false,
    timestamp: "",
    odometro: "",
    combustible_porcentaje: "",
    combustible_litros: "",
    terminal_entrega_vacio: "", // Inicializado
    fase_operativa: activeLeg?.leg_type || "",
  });

  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState("");

  // Manejo de carga inicial (Edición vs Creación)
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
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
          timestamp: eventToEdit.time || "",
          odometro: "",
          combustible_porcentaje: "",
          combustible_litros: "",
          terminal_entrega_vacio: "",
          fase_operativa: activeLeg?.leg_type || "",
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
          terminal_entrega_vacio: "",
          fase_operativa: activeLeg?.leg_type || "",
        });
      }
      setSearchLocationQuery("");
      setGeoapifyResults([]);
    }
  }, [open, eventToEdit, activeLeg]);

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

  // MÁQUINA DE ESTADOS DINÁMICA POR FASE OPERATIVA
  const statusOptions = useMemo(() => {
    const baseOptions = [
      {
        value: "en_transito",
        label: "📍 Reporte de Posición (Normal)",
        color: "bg-blue-500",
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
        color: "bg-rose-500",
      },
      {
        value: "accidente",
        label: " Accidente / Siniestro Mayor",
        color: "bg-red-800",
      },
    ];

    if (activeLeg?.leg_type === "carga_muelle") {
      const options = [
        {
          value: "en_camino_origen",
          label: "🚛 En tránsito hacia el puerto/muelle",
          color: "bg-indigo-400",
        },
        {
          value: "cargando_muelle",
          label: "🏗️ Cargando mercancía en muelle",
          color: "bg-indigo-500",
        },
        {
          value: "retorno_patio",
          label: " Retornando cargado al patio 3T",
          color: "bg-indigo-600",
        },
        ...baseOptions,
        {
          value: "llegada_patio_3t",
          label: "🏁 En resguardo en patio (Finaliza Fase 1)",
          color: "bg-emerald-500",
        },
      ];
      // Fallback por si editan un estado viejo no mapeado
      if (eventToEdit && !options.find((o) => o.value === formData.status)) {
        options.push({
          value: formData.status,
          label: formData.status,
          color: "bg-slate-500",
        });
      }
      return options;
    }

    if (activeLeg?.leg_type === "entrega_vacio") {
      const options = [
        {
          value: "retorno_vacio",
          label: " Inicia retorno de vacío",
          color: "bg-purple-400",
        },
        ...baseOptions,
        {
          value: "entregado",
          label: "🏁 Regreso a patio / Terminal entregado (Finaliza Viaje)",
          color: "bg-emerald-500",
        },
      ];
      if (eventToEdit && !options.find((o) => o.value === formData.status)) {
        options.push({
          value: formData.status,
          label: formData.status,
          color: "bg-slate-500",
        });
      }
      return options;
    }

    // Default (ruta_carretera)
    const options = [
      {
        value: "inicio_ruta",
        label: "🛣️ Inicio de ruta fiscal",
        color: "bg-blue-400",
      },
      ...baseOptions,
      {
        value: "arribo_cliente",
        label: "🏁 Arribo a destino con cliente (Finaliza Fase 2)",
        color: "bg-emerald-500",
      },
    ];
    if (eventToEdit && !options.find((o) => o.value === formData.status)) {
      options.push({
        value: formData.status,
        label: formData.status,
        color: "bg-slate-500",
      });
    }
    return options;
  }, [activeLeg?.leg_type, eventToEdit, formData.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();

    let dbStatus = formData.status;

    // 1. Normalización de estados para la base de datos
    if (
      ["detenido_descanso", "revision_autoridad", "incidencia"].includes(
        formData.status,
      )
    ) {
      dbStatus = "detenido";
    }

    // 2. 📧 LÓGICA DE NOTIFICACIÓN (Tracking Externo o Alerta Interna)
    if (!eventToEdit) {
      // Caso A: El monitorista activó "Notificar al Cliente"
      if (formData.notifyClient) {
        await sendSecurityNotification({
          event: "trip_tracking_update",
          details: {
            tripId: serviceId,
            statusLabel: selectedStatus?.label || formData.status,
            location: formData.location,
            comments: formData.comments,
            clientName: trip?.client?.razon_social || "Cliente",
            isExternal: true, // Esto le dice al backend: "Manda el correo"
          },
        });
        toast.success("Tracking enviado al cliente.");
      }

      // Caso B: Es una incidencia de seguridad (siempre se notifica internamente)
      const isIncident = [
        "detenido",
        "retraso",
        "accidente",
        "incidencia",
        "revision_autoridad",
      ].includes(formData.status);
      if (isIncident) {
        await sendSecurityNotification({
          event:
            formData.status === "accidente" ? "trip_incident" : "trip_stopped",
          details: {
            tripId: serviceId,
            reason: formData.comments || "Sin comentarios detallados",
            userName: "Monitorista",
            location: formData.location,
          },
        });
      }
    }

    // 3. GUARDAR EL EVENTO EN LA LÍNEA DE TIEMPO (Llamada al backend)
    try {
      await onSubmit({
        ...formData,
        status: dbStatus,
        fase_operativa: activeLeg?.leg_type || "desconocida",
        timestamp: eventToEdit ? formData.timestamp : timestamp,
      });
      // FIX CRÍTICO 2: Obligamos al componente padre a cerrarse y refrescar la tabla
      toast.success("Estatus actualizado exitosamente.");
      onOpenChange(false);
    } catch (err) {
      toast.error("Error al guardar el reporte en la base de datos.");
    } finally {
      setIsSubmitting(false);
    }
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) onOpenChange(false);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[550px] p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                eventToEdit
                  ? "bg-brand-green/10 border-brand-green/20"
                  : isIncidentUI
                    ? "bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-500/20"
                    : "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/20",
              )}
            >
              {eventToEdit ? (
                <Edit2 className="h-6 w-6 text-brand-green" />
              ) : isIncidentUI ? (
                <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              ) : (
                <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle
                className={cn(
                  "text-2xl font-black uppercase tracking-tighter heading-crisp leading-none",
                  isIncidentUI
                    ? "text-rose-600 dark:text-rose-500"
                    : "text-slate-900 dark:text-white",
                )}
              >
                {eventToEdit ? "Corregir Reporte" : "Registrar Novedad"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 truncate tracking-normal normal-case">
                Viaje{" "}
                <span className="font-mono font-bold text-brand-navy dark:text-blue-400 uppercase">
                  #{serviceId}
                </span>{" "}
                —{" "}
                {eventToEdit ? "Edición de bitácora" : "Actualización de ruta"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY Y FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar">
            <div className="space-y-6">
              {/* TIPO DE EVENTO */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-blue-500" /> Motivo de
                  Actualización *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={cn(
                      "h-12 border font-bold transition-all bg-card shadow-sm text-sm",
                      isIncidentUI
                        ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20"
                        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-slate-100",
                    )}
                  >
                    <SelectValue placeholder="Selecciona el motivo...">
                      {selectedStatus && (
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "w-3 h-3 rounded-full shadow-sm",
                              selectedStatus.color,
                            )}
                          />
                          <span>{selectedStatus.label}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-white/10">
                    {statusOptions.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className="font-bold text-xs uppercase tracking-tight py-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shadow-sm shrink-0",
                              status.color,
                            )}
                          />
                          <span
                            className={cn(
                              [
                                "accidente",
                                "incidencia",
                                "retraso",
                                "detenido_descanso",
                                "revision_autoridad",
                              ].includes(status.value)
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-slate-700 dark:text-slate-200",
                            )}
                          >
                            {status.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UBICACIÓN CON GEOAPIFY */}
              <div className="space-y-4 border border-slate-200 dark:border-white/10 bg-card p-5 rounded-2xl shadow-sm">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />{" "}
                    Ubicación o Referencia *
                  </Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full justify-between h-11 font-bold border transition-colors overflow-hidden shadow-sm",
                          formData.location
                            ? "border-blue-300 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30 text-brand-navy dark:text-blue-100"
                            : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800",
                        )}
                      >
                        <span className="truncate flex-1 text-left mr-2 max-w-[380px] uppercase text-xs">
                          {formData.location ||
                            "Busca o pega la ubicación aquí..."}
                        </span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[calc(100vw-3rem)] sm:w-[480px] p-0 rounded-xl overflow-hidden border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <div className="relative border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800">
                          {/* FIX 1: Lupa doble eliminada y onKeyDown agregado */}
                          <CommandInput
                            placeholder="Escribe, pega el GPS y presiona ENTER para agregar..."
                            value={searchLocationQuery}
                            onValueChange={setSearchLocationQuery}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                searchLocationQuery.trim() !== ""
                              ) {
                                e.preventDefault();
                                setFormData({
                                  ...formData,
                                  location: searchLocationQuery.trim(),
                                  lat: "",
                                  lng: "",
                                });
                                setSearchLocationQuery("");
                                setOpenCombobox(false);
                              }
                            }}
                            className="h-11 border-0 focus:ring-0 font-bold text-xs uppercase tracking-tight dark:text-white"
                          />
                          {isSearchingGeo && (
                            <Loader2 className="absolute right-4 top-3.5 h-4 w-4 text-blue-500 animate-spin" />
                          )}
                        </div>

                        <CommandList className="max-h-[30vh] sm:max-h-[300px] custom-scrollbar">
                          {/* FIX 2: Silenciamos el mensaje por defecto */}
                          <CommandEmpty className="hidden" />

                          {/* FIX 3: Botón SIEMPRE visible si hay texto escrito */}
                          {searchLocationQuery.trim() !== "" && (
                            <div className="p-2 border-b border-slate-100 dark:border-white/10 bg-blue-50/50 dark:bg-blue-900/10">
                              <Button
                                type="button"
                                className="w-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 shadow-none font-bold text-xs uppercase h-auto py-3 whitespace-normal flex flex-col gap-1"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    location: searchLocationQuery.trim(),
                                    lat: "",
                                    lng: "",
                                  });
                                  setSearchLocationQuery("");
                                  setOpenCombobox(false);
                                }}
                              >
                                <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                  ¿Pegaste un texto o coordenada?
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                                  Haz clic aquí o presiona{" "}
                                  <kbd className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-1.5 py-0.5 rounded border shadow-sm">
                                    ENTER
                                  </kbd>
                                </span>
                                <span className="text-brand-navy dark:text-white mt-1 text-sm border-b border-brand-navy/30 dark:border-white/30 pb-0.5">
                                  "{searchLocationQuery}"
                                </span>
                              </Button>
                            </div>
                          )}

                          {/* RESULTADOS DE GEOAPIFY */}
                          {geoapifyResults.length > 0 && (
                            <CommandGroup
                              heading={
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[9px] mb-1">
                                  <MapPin className="h-3 w-3" /> Resultados del
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
                                      value={addr}
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
                                      className="cursor-pointer py-3 border-b border-slate-50 dark:border-white/5 last:border-0"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight">
                                          {feature.properties.address_line1 ||
                                            addr}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">
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

                          {/* HISTORIAL */}
                          {customLocations.length > 0 &&
                            !searchLocationQuery && (
                              <CommandGroup
                                heading={
                                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-[9px] mb-1">
                                    <History className="h-3 w-3" /> Historial
                                    Reciente
                                  </div>
                                }
                              >
                                {customLocations.map((loc) => (
                                  <CommandItem
                                    key={`custom-${loc.address}`}
                                    value={loc.address}
                                    onSelect={() => {
                                      setFormData({
                                        ...formData,
                                        location: loc.address,
                                        lat: loc.lat,
                                        lng: loc.lng,
                                      });
                                      setOpenCombobox(false);
                                    }}
                                    className="cursor-pointer py-3"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-3 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0",
                                        formData.location === loc.address
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <span className="font-bold text-xs uppercase tracking-tight text-slate-700 dark:text-slate-300">
                                      {loc.address}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}

                          {/* POR DEFECTO */}
                          {!searchLocationQuery && (
                            <CommandGroup
                              heading={
                                <div className="flex items-center gap-1.5 text-brand-navy dark:text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">
                                  <Bookmark className="h-3 w-3" /> Puntos de
                                  Control SCT
                                </div>
                              }
                            >
                              {DEFAULT_LOCATIONS.map((loc) => (
                                <CommandItem
                                  key={`default-${loc}`}
                                  value={loc}
                                  onSelect={() => {
                                    setFormData({
                                      ...formData,
                                      location: loc,
                                      lat: "",
                                      lng: "",
                                    });
                                    setOpenCombobox(false);
                                  }}
                                  className="cursor-pointer py-3 text-slate-600 dark:text-slate-400"
                                >
                                  <Check
                                    className={cn(
                                      "mr-3 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0",
                                      formData.location === loc
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="font-bold text-xs uppercase tracking-tight">
                                    {loc}
                                  </span>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Compass className="h-3 w-3 text-blue-400" /> Latitud
                    </Label>
                    <Input
                      placeholder="Ej: 19.4326"
                      className="h-10 font-mono text-sm bg-muted border-slate-200 dark:border-white/5 shadow-inner text-slate-800 dark:text-slate-100"
                      value={formData.lat}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        setFormData({ ...formData, lat: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Compass className="h-3 w-3 text-blue-400" /> Longitud
                    </Label>
                    <Input
                      placeholder="Ej: -99.1332"
                      className="h-10 font-mono text-sm bg-muted border-slate-200 dark:border-white/5 shadow-inner text-slate-800 dark:text-slate-100"
                      value={formData.lng}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        setFormData({ ...formData, lng: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* CAMPO OBLIGATORIO PARA CIERRE DE VACÍO */}
              {(formData.status === "entregado" ||
                formData.status === "retorno_vacio") &&
                activeLeg?.leg_type === "entrega_vacio" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                    <Label className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                      Terminal / Patio de Entrega *
                    </Label>
                    <Input
                      placeholder="Ej: ICAVE, CCS, San Julián..."
                      value={formData.terminal_entrega_vacio || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          terminal_entrega_vacio: e.target.value.toUpperCase(),
                        })
                      }
                      className="h-11 font-bold bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                )}

              {/* TELEMETRÍA */}
              {!eventToEdit && (
                <div className="grid grid-cols-3 gap-4 p-5 bg-card border border-slate-200 dark:border-white/10 rounded-2xl mt-2 shadow-sm">
                  <div className="col-span-3 pb-3 border-b border-slate-100 dark:border-white/5 mb-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      Parámetros de Unidad
                      <span className="font-medium text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-white/5 italic normal-case">
                        Telemetría Opcional
                      </span>
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5" /> Odómetro
                    </Label>
                    <Input
                      type="number"
                      placeholder="Km"
                      className="h-10 font-mono text-sm font-bold bg-muted border-slate-200 dark:border-white/10 shadow-inner text-slate-800 dark:text-slate-100"
                      value={formData.odometro}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        setFormData({ ...formData, odometro: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Droplet className="h-3.5 w-3.5" /> % Diésel
                    </Label>
                    <Input
                      type="number"
                      max="100"
                      placeholder="%"
                      className="h-10 font-mono text-sm font-bold bg-muted border-slate-200 dark:border-white/10 shadow-inner text-slate-800 dark:text-slate-100"
                      value={formData.combustible_porcentaje}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          combustible_porcentaje: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Droplet className="h-3.5 w-3.5" /> Litros
                    </Label>
                    <Input
                      type="number"
                      placeholder="Lts"
                      className="h-10 font-mono text-sm font-bold bg-muted border-slate-200 dark:border-white/10 shadow-inner text-slate-800 dark:text-slate-100"
                      value={formData.combustible_litros}
                      disabled={isSubmitting}
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

              {/* NOTIFICAR AL CLIENTE */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl mt-2">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-400 tracking-widest flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> Notificar al Cliente (Tracking)
                  </Label>
                  <p className="text-[10px] text-blue-600 dark:text-blue-500 font-medium">
                    Enviará un correo automático con este estatus y ubicación
                    actual.
                  </p>
                </div>
                <Switch
                  checked={formData.notifyClient}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifyClient: checked })
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* COMENTARIOS */}
              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Detalles / Novedades{" "}
                  {isIncidentUI && (
                    <span className="text-rose-500 text-lg leading-none">
                      *
                    </span>
                  )}
                </Label>
                <Textarea
                  placeholder="Escribe notas adicionales sobre este reporte..."
                  value={formData.comments}
                  disabled={isSubmitting}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  rows={3}
                  className={cn(
                    "resize-none font-medium text-sm transition-all shadow-sm",
                    isIncidentUI
                      ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/20 focus-visible:ring-rose-200 dark:focus-visible:ring-rose-500/20"
                      : "bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100",
                  )}
                  required={isIncidentUI}
                />
              </div>
            </div>
          </div>

          {/* CAPA 4: FOOTER TAHOE */}
          <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={
                  isSubmitting ||
                  !formData.status ||
                  !formData.location ||
                  (isIncidentUI && !formData.comments)
                }
                className={cn(
                  "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px]",
                  eventToEdit
                    ? "bg-brand-green hover:bg-brand-green/80 shadow-emerald-500/20"
                    : isIncidentUI
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-brand-navy hover:bg-slate-800 shadow-blue-500/20",
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : eventToEdit ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : isIncidentUI ? (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                ) : (
                  <Navigation className="mr-2 h-4 w-4" />
                )}
                {eventToEdit
                  ? "Guardar Cambios"
                  : isIncidentUI
                    ? "Reportar Incidencia"
                    : "Guardar Reporte"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
