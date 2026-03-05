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
import { Checkbox } from "@/components/ui/checkbox";
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
  Mail,
  AlertTriangle,
  Edit2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trip, TripLeg } from "@/types/api.types";

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  activeLeg?: TripLeg;
  onSubmit: (data: StatusUpdateData) => void;
}

export interface StatusUpdateData {
  status: string;
  location: string;
  lat?: string;
  lng?: string;
  comments: string;
  notifyClient: boolean;
  timestamp: string;
}

// 🚀 DICCIONARIO DE PUNTOS CLAVE PARA AUTOCOMPLETADO
const COMMON_LOCATIONS = [
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
  activeLeg,
  onSubmit,
}: UpdateStatusModalProps) {
  const [formData, setFormData] = useState<StatusUpdateData>({
    status: "",
    location: "",
    lat: "",
    lng: "",
    comments: "",
    notifyClient: false,
    timestamp: "",
  });

  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState("");

  // Limpiar formulario al abrir
  useEffect(() => {
    if (open) {
      setFormData({
        status: "",
        location: "",
        lat: "",
        lng: "",
        comments: "",
        notifyClient: false,
        timestamp: "",
      });
      setSearchLocationQuery("");
    }
  }, [open]);

  // 🚀 HOMOLOGACIÓN DE ESTATUS SEGÚN LA FASE ACTIVA
  const statusOptions = useMemo(() => {
    const isMuelle = activeLeg?.leg_type === "carga_muelle";
    const isRetorno = activeLeg?.leg_type === "entrega_vacio";
    const isCarretera = activeLeg?.leg_type === "ruta_carretera";

    let labelTransito = "En Ruta / Tránsito Normal";
    if (isMuelle) labelTransito = "🚜 Operando en Muelle / Patio";
    if (isCarretera) labelTransito = "🚚 En Carretera (Viaje a Destino)";
    if (isRetorno) labelTransito = "🔄 Retornando Vacío";

    let labelEntregado = "Arribo Físico (En Destino)";
    if (isMuelle) labelEntregado = "📦 Cargado en Patio (Listo para Ruta)";
    if (isCarretera) labelEntregado = "⏳ Vacío en Patio (Viaje Terminado)";
    if (isRetorno) labelEntregado = "🏁 Llegada Final / Vaciado";

    return [
      { value: "en_transito", label: labelTransito, color: "bg-blue-500" },
      { value: "entregado", label: labelEntregado, color: "bg-emerald-500" },
      {
        value: "punto_control",
        label: "📍 Reporte de Avance / Punto de Control",
        color: "bg-sky-500",
      },
      {
        value: "detenido",
        label: "Detenido (Inspección/Descanso/Tránsito)",
        color: "bg-amber-500",
      },
      {
        value: "retraso",
        label: "Retraso Operativo (Clima/Fila en Puerto)",
        color: "bg-orange-500",
      },
      {
        value: "accidente",
        label: "Accidente (Avería Mecánica/Siniestro)",
        color: "bg-red-600",
      },
      {
        value: "bloqueado",
        label: "Bloqueado (Problema Administrativo/Aduana)",
        color: "bg-red-900",
      },
    ];
  }, [activeLeg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const timestamp = now.toISOString();

    // 🚀 PREVENCIÓN DE ERROR 500 (BASE DE DATOS ENUM)
    // Si el despachador seleccionó "Punto de Control", el estado real para la BD
    // debe seguir siendo "en_transito" para no violar el ENUM de PostgreSQL.
    let finalStatus = formData.status;
    let finalComments = formData.comments;

    if (formData.status === "punto_control") {
      finalStatus = "en_transito";
      // Le inyectamos una etiqueta visual al comentario para que resalte en el Traffic Log
      finalComments = `📍 PUNTO DE AVANCE: ${formData.comments}`;
    }

    onSubmit({
      ...formData,
      status: finalStatus,
      comments: finalComments,
      timestamp,
    });

    if (formData.notifyClient) {
      toast.success("Correo enviado al cliente", {
        description: `Notificación de estatus enviada exitosamente.`,
      });
    }
  };

  const selectedStatus = statusOptions.find((s) => s.value === formData.status);
  const isIncident = ["detenido", "retraso", "accidente", "bloqueado"].includes(
    formData.status,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy font-black text-xl">
            <Edit2 className="h-5 w-5" />
            Registrar Novedad en Bitácora
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Actualiza el historial del viaje <strong>#{serviceId}</strong>.
            {activeLeg && (
              <span className="block mt-2 text-xs text-brand-navy bg-slate-50 p-2 rounded border border-slate-200">
                Afectando la Fase Activa:{" "}
                <strong>
                  {activeLeg.leg_type.replace("_", " ").toUpperCase()}
                </strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* ESTATUS */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Navigation className="h-3.5 w-3.5 text-brand-navy" />
              Tipo de Evento *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              required
            >
              <SelectTrigger
                className={`h-12 text-sm font-bold border-2 ${isIncident ? "border-red-200 bg-red-50" : "border-slate-200"}`}
              >
                <SelectValue placeholder="Selecciona qué está pasando...">
                  {selectedStatus && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full shadow-sm ${selectedStatus.color}`}
                      />
                      <span
                        className={
                          isIncident ? "text-red-700" : "text-slate-800"
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
                    className="text-sm font-medium py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full shadow-sm ${status.color}`}
                      />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* UBICACIÓN CON COMBOBOX SHADCN (PERMITE TEXTO LIBRE O SELECCIÓN) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand-navy" />
              Ubicación o Referencia Actual *
            </Label>

            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between h-12 font-medium bg-white border-2 border-slate-200 hover:bg-slate-50"
                >
                  {formData.location || (
                    <span className="text-slate-400">
                      Ej: Caseta de Tepotzotlán / Escribe lugar...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[470px] p-0" align="start">
                <Command>
                  {/* Este input actualiza la búsqueda y también permite escribir lo que sea */}
                  <CommandInput
                    placeholder="Buscar o escribir nueva ubicación..."
                    value={searchLocationQuery}
                    onValueChange={setSearchLocationQuery}
                  />
                  <CommandList>
                    <CommandEmpty className="p-4 text-sm text-center text-slate-500">
                      <p className="mb-2">No está en la lista rápida.</p>
                      {/* Botón para forzar el uso del texto libre */}
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full font-bold"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            location: searchLocationQuery,
                          });
                          setOpenCombobox(false);
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Usar: "{searchLocationQuery}"
                      </Button>
                    </CommandEmpty>
                    <CommandGroup heading="Lugares Frecuentes">
                      {COMMON_LOCATIONS.map((loc) => (
                        <CommandItem
                          key={loc}
                          value={loc}
                          onSelect={(currentValue) => {
                            // En shadcn, el currentValue viene en minúsculas por defecto, así que usamos el original (loc)
                            setFormData({ ...formData, location: loc });
                            setSearchLocationQuery("");
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-brand-navy",
                              formData.location === loc
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {loc}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* COMENTARIOS */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-brand-navy" />
              Detalles / Observaciones
            </Label>
            <Textarea
              placeholder="Describe el motivo del retraso, novedades en el camino o estatus general..."
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={3}
              className={`text-sm resize-none border-2 ${isIncident ? "border-red-200 focus-visible:ring-red-500" : "border-slate-200"}`}
              required={isIncident}
            />
            {isIncident && (
              <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Las incidencias requieren
                obligatoriamente una descripción.
              </p>
            )}
          </div>

          {/* NOTIFICAR CLIENTE */}
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
            <Checkbox
              id="notifyClient"
              checked={formData.notifyClient}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyClient: checked as boolean })
              }
              className="h-5 w-5 data-[state=checked]:bg-brand-navy"
            />
            <Label
              htmlFor="notifyClient"
              className="text-sm font-bold text-slate-700 flex flex-col cursor-pointer leading-tight"
            >
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Notificar al Cliente por Correo
              </span>
              <span className="text-[10px] text-slate-500 font-medium ml-6 mt-1">
                Se enviará un reporte automático de este evento al correo
                registrado.
              </span>
            </Label>
          </div>

          {/* BOTONERA */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`h-12 px-8 font-black text-white shadow-md transition-colors ${
                isIncident
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-brand-navy hover:bg-brand-navy/90"
              }`}
              disabled={
                !formData.status ||
                !formData.location ||
                (isIncident && !formData.comments)
              }
            >
              {isIncident ? "Registrar Incidencia" : "Guardar en Bitácora"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
