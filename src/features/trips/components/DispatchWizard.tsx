import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  ChevronRight,
  Link as LinkIcon,
  Truck,
  ChevronsUpDown,
  Clock,
  User,
  Box,
  CalendarDays,
  Container,
  ShieldCheck,
  Loader2,
  MapPin,
  ClipboardList,
  Award,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";

// Command + Popover
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

import { cn, checkIsFullTrip } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";

// Hooks
import { useUnits } from "@/features/units/hooks/useUnits";
import { useOperators } from "@/features/operators/hooks/useOperators";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { useClients } from "@/features/clients/hooks/useClients";
import { useSatCatalogs } from "@/features/settings/hooks/useSatCatalogs";

// Types
import type { TripCreatePayload, TripStatus } from "@/features/trips/types";
import { SubClient, Tariff } from "@/features/clients/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Step = 1 | 2 | 3;

type SearchableItem = {
  label: string;
  value: string;
};

export type WizardData = {
  clienteId: string;
  subClienteId: string;
  routeId: string;
  routeNombre: string;
  origen: string;
  destino: string;
  fecha_programada: Date | undefined;

  descripcion_mercancia: string;
  peso_toneladas: number;
  es_material_peligroso: boolean;
  clase_imo: string;

  referencia_cliente: string;
  contenedor_1: string;
  contenedor_2: string;

  unitId: string;
  remolque1Id: string;
  dollyId: string;
  remolque2Id: string;
  driverId: string;

  leg_type: string;

  // 🚀 CAMPOS PARA EL MOTOR DUAL (1 TIMBRE)
  conoceRutaCompleta: boolean;
  unit2Id: string;
  driver2Id: string;
  remolque1Id_2: string;
  dollyId_2: string;
  remolque2Id_2: string;

  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;

  generarCartaPorte: boolean;
};

export interface DispatchWizardProps {
  initialData?: Partial<WizardData> & { id?: number; status?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const normalizeStr = (str?: string | null) =>
  str
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") || "";

const shellClass =
  "overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-2xl shadow-slate-200/50 dark:shadow-black/30 backdrop-blur-xl";

const headerClass = "border-b border-border bg-card";

const bodyClass = "bg-muted/30 dark:bg-transparent";

const footerClass =
  "sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-xl";

const sunkPanelClass =
  "rounded-[20px] border border-border bg-muted/50 p-4 shadow-inner dark:shadow-black/30";

const sectionCardClass =
  "rounded-[20px] border border-border bg-card/75 p-4 shadow-xl backdrop-blur-xl dark:shadow-black/20";

function TahoeIconPlate({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "red" | "green" | "blue" | "amber" | "indigo" | "neutral";
  className?: string;
}) {
  const toneClass =
    tone === "red"
      ? "bg-brand-red/15 text-brand-red ring-brand-red/15"
      : tone === "green"
        ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/15"
        : tone === "blue"
          ? "bg-blue-600/15 text-blue-700 ring-blue-600/15"
          : tone === "amber"
            ? "bg-amber-500/15 text-amber-700 ring-amber-500/15"
            : tone === "indigo"
              ? "bg-indigo-500/15 text-indigo-700 ring-indigo-500/15"
              : "bg-slate-500/10 text-slate-700 ring-slate-500/10";

  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ring-1 ring-inset",
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

function SearchableSelect({
  items,
  value,
  onSelect,
  placeholder,
  className,
}: {
  items: SearchableItem[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between rounded-xl border-border bg-card/90 px-4 font-semibold text-foreground shadow-sm backdrop-blur-xl hover:bg-card",
            className,
          )}
        >
          {selectedItem ? (
            <span className="truncate text-left">{selectedItem.label}</span>
          ) : (
            <span className="truncate text-left text-slate-400 dark:text-slate-500">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(380px,calc(100vw-2rem))] p-0"
        align="start"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder="Escribe para buscar..." />
          <CommandList className="max-h-[280px]">
            <CommandEmpty />
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  className="rounded-xl"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const DispatchWizard = ({
  initialData: propsInitialData,
  onSuccess,
  onCancel,
}: DispatchWizardProps) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");
  const tripFromState = location.state?.trip;

  const initialData = useMemo(() => {
    if (propsInitialData) return propsInitialData;
    if (tripFromState) {
      return {
        id: tripFromState.id,
        status: tripFromState.status,
        clienteId: String(tripFromState.client_id || ""),
        subClienteId: String(tripFromState.sub_client_id || ""),
        routeId: String(tripFromState.tariff_id || ""),
        routeNombre: tripFromState.route_name || "",
        origen: tripFromState.origin || "",
        destino: tripFromState.destination || "",
        fecha_programada: tripFromState.fecha_programada
          ? new Date(tripFromState.fecha_programada)
          : new Date(),
        descripcion_mercancia: tripFromState.descripcion_mercancia || "",
        peso_toneladas: tripFromState.peso_toneladas || 0,
        es_material_peligroso: tripFromState.es_material_peligroso || false,
        clase_imo: tripFromState.clase_imo || "",
        contenedor_1: tripFromState.contenedor_1 || "",
        contenedor_2: tripFromState.contenedor_2 || "",
        referencia_cliente: tripFromState.referencia || "",
        unitId: tripFromState.legs?.[0]?.unit_id
          ? String(tripFromState.legs[0].unit_id)
          : "",
        remolque1Id: tripFromState.remolque_1_id
          ? String(tripFromState.remolque_1_id)
          : "",
        dollyId: tripFromState.dolly_id ? String(tripFromState.dolly_id) : "",
        remolque2Id: tripFromState.remolque_2_id
          ? String(tripFromState.remolque_2_id)
          : "",
        driverId: tripFromState.legs?.[0]?.operator_id
          ? String(tripFromState.legs[0].operator_id)
          : "",
        leg_type: tripFromState.legs?.[0]?.leg_type || "carga_muelle",
        anticipo_casetas: tripFromState.legs?.[0]?.anticipo_casetas || 0,
        anticipo_viaticos: tripFromState.legs?.[0]?.anticipo_viaticos || 0,
        anticipo_combustible:
          tripFromState.legs?.[0]?.anticipo_combustible || 0,
        generarCartaPorte: true,
        conoceRutaCompleta: (tripFromState.legs?.length || 0) > 1,
        // Carga dinámica de tramo 2
        unit2Id: tripFromState.legs?.[1]?.unit_id
          ? String(tripFromState.legs[1].unit_id)
          : "",
        driver2Id: tripFromState.legs?.[1]?.operator_id
          ? String(tripFromState.legs[1].operator_id)
          : "",
        remolque1Id_2: tripFromState.remolque_1_id
          ? String(tripFromState.remolque_1_id)
          : "",
        dollyId_2: tripFromState.dolly_id ? String(tripFromState.dolly_id) : "",
        remolque2Id_2: tripFromState.remolque_2_id
          ? String(tripFromState.remolque_2_id)
          : "",
      } as Partial<WizardData> & { id?: number; status?: string };
    }
    return undefined;
  }, [propsInitialData, tripFromState]);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isStamping, setIsStamping] = useState(false);

  const [tripId, setTripId] = useState<number | null>(initialData?.id || null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const { createTrip, trips } = useTrips();
  const { clients } = useClients();
  const { products: satProducts } = useSatCatalogs();

  const availableSatProducts = useMemo(
    () =>
      satProducts.map((p) => ({
        label: `${p.clave} - ${p.descripcion}`,
        value: p.clave,
        ...p,
      })),
    [satProducts],
  );

  const [data, setData] = useState<WizardData>({
    clienteId: initialData?.clienteId || "",
    subClienteId: initialData?.subClienteId || "",
    routeId: initialData?.routeId || "",
    routeNombre: initialData?.routeNombre || "",
    origen: initialData?.origen || "",
    destino: initialData?.destino || "",
    fecha_programada: initialData?.fecha_programada
      ? new Date(initialData.fecha_programada)
      : new Date(),
    descripcion_mercancia: initialData?.descripcion_mercancia || "",
    peso_toneladas: initialData?.peso_toneladas || 0,
    es_material_peligroso: initialData?.es_material_peligroso || false,
    clase_imo: initialData?.clase_imo || "",
    contenedor_1: initialData?.contenedor_1 || "",
    contenedor_2: initialData?.contenedor_2 || "",
    referencia_cliente: initialData?.referencia_cliente || "",
    unitId: initialData?.unitId || "",
    remolque1Id: initialData?.remolque1Id || "",
    dollyId: initialData?.dollyId || "",
    remolque2Id: initialData?.remolque2Id || "",
    driverId: initialData?.driverId || "",
    leg_type: initialData?.leg_type || "carga_muelle",
    conoceRutaCompleta: initialData?.conoceRutaCompleta ?? false,
    unit2Id: initialData?.unit2Id || "",
    driver2Id: initialData?.driver2Id || "",
    remolque1Id_2: initialData?.remolque1Id_2 || "",
    dollyId_2: initialData?.dollyId_2 || "",
    remolque2Id_2: initialData?.remolque2Id_2 || "",
    anticipo_casetas: initialData?.anticipo_casetas || 0,
    anticipo_viaticos: initialData?.anticipo_viaticos || 0,
    anticipo_combustible: initialData?.anticipo_combustible || 0,
    generarCartaPorte: initialData?.generarCartaPorte ?? true,
  });

  useEffect(() => {
    if (!data.clienteId && tripIdParam && trips.length > 0 && !tripFromState) {
      const foundTrip = trips.find((t) => String(t.id) === tripIdParam) as any;
      if (foundTrip) {
        setTripId(foundTrip.id);
        setData((prev) => ({
          ...prev,
          clienteId: String(foundTrip.client_id || ""),
          subClienteId: String(foundTrip.sub_client_id || ""),
          routeId: String(foundTrip.tariff_id || ""),
          routeNombre: foundTrip.route_name || "",
          origen: foundTrip.origin || "",
          destino: foundTrip.destination || "",
          fecha_programada: foundTrip.fecha_programada
            ? new Date(foundTrip.fecha_programada)
            : new Date(),
          descripcion_mercancia: foundTrip.descripcion_mercancia || "",
          peso_toneladas: foundTrip.peso_toneladas || 0,
          es_material_peligroso: foundTrip.es_material_peligroso || false,
          clase_imo: foundTrip.clase_imo || "",
          contenedor_1: foundTrip.contenedor_1 || "",
          contenedor_2: foundTrip.contenedor_2 || "",
          referencia_cliente: foundTrip.referencia || "",
          unitId: foundTrip.legs?.[0]?.unit_id
            ? String(foundTrip.legs[0].unit_id)
            : "",
          remolque1Id: foundTrip.remolque_1_id
            ? String(foundTrip.remolque_1_id)
            : "",
          dollyId: foundTrip.dolly_id ? String(foundTrip.dolly_id) : "",
          remolque2Id: foundTrip.remolque_2_id
            ? String(foundTrip.remolque_2_id)
            : "",
          driverId: foundTrip.legs?.[0]?.operator_id
            ? String(foundTrip.legs[0].operator_id)
            : "",
          leg_type: foundTrip.legs?.[0]?.leg_type || "carga_muelle",
          anticipo_casetas: foundTrip.legs?.[0]?.anticipo_casetas || 0,
          anticipo_viaticos: foundTrip.legs?.[0]?.anticipo_viaticos || 0,
          anticipo_combustible: foundTrip.legs?.[0]?.anticipo_combustible || 0,
          // Carga dinámica de tramo 2
          conoceRutaCompleta: (foundTrip.legs?.length || 0) > 1,
          unit2Id: foundTrip.legs?.[1]?.unit_id
            ? String(foundTrip.legs[1].unit_id)
            : "",
          driver2Id: foundTrip.legs?.[1]?.operator_id
            ? String(foundTrip.legs[1].operator_id)
            : "",
          remolque1Id_2: foundTrip.remolque_1_id
            ? String(foundTrip.remolque_1_id)
            : "",
          dollyId_2: foundTrip.dolly_id ? String(foundTrip.dolly_id) : "",
          remolque2Id_2: foundTrip.remolque_2_id
            ? String(foundTrip.remolque_2_id)
            : "",
        }));
      }
    }
  }, [tripIdParam, trips, data.clienteId, tripFromState]);

  const arrUnidades = useMemo(
    () => (Array.isArray(unidades) ? unidades : []),
    [unidades],
  );
  const arrOperadores = useMemo(
    () => (Array.isArray(operadores) ? operadores : []),
    [operadores],
  );
  const arrClients = useMemo(
    () => (Array.isArray(clients) ? clients : []),
    [clients],
  );

  const availableTractos = useMemo(
    () =>
      arrUnidades
        .filter((u: any) => {
          const searchIn =
            `${u.tipo_1} ${u.tipo} ${u.tipo_unidad}`.toLowerCase();
          return (
            (searchIn.includes("tracto") || searchIn.includes("camion")) &&
            ["disponible", "bloqueado"].includes(u.status?.toLowerCase())
          );
        })
        .map((u: any) => ({
          label: `ECO-${u.numero_economico} - ${u.placas || "S/P"}`,
          value: String(u.id),
        })),
    [arrUnidades],
  );

  const availableRemolques = useMemo(() => {
    const remolquesReales = arrUnidades
      .filter((u: any) => {
        const searchIn = `${u.tipo_1} ${u.tipo}`.toLowerCase();
        const isTracto =
          searchIn.includes("tracto") || searchIn.includes("camion");
        const isDolly = searchIn.includes("dolly");
        return (
          !isTracto &&
          !isDolly &&
          ["disponible", "bloqueado"].includes(u.status?.toLowerCase())
        );
      })
      .map((u: any) => ({
        label: `${u.numero_economico} - ${u.placas || "S/P"} | ${u.is_loaded ? "📦 CARGADO" : "➖ VACÍO"}`,
        value: String(u.id),
      }));
    return remolquesReales.length === 0
      ? [{ label: "No hay remolques disponibles", value: "" }]
      : remolquesReales;
  }, [arrUnidades]);

  const availableDollies = useMemo(() => {
    const dolliesReales = arrUnidades
      .filter(
        (u: any) =>
          normalizeStr(u.tipo_1).includes("dolly") &&
          ["disponible", "bloqueado"].includes(u.status?.toLowerCase()),
      )
      .map((u: any) => ({
        label: `${u.numero_economico} (DOLLY)`,
        value: String(u.id),
      }));
    return dolliesReales.length === 0
      ? [{ label: "DOLLY-PRUEBA", value: "9997" }]
      : dolliesReales;
  }, [arrUnidades]);

  const availableOperators = useMemo(
    () =>
      arrOperadores
        .filter((o: any) =>
          ["activo", "disponible", "inactivo"].includes(
            o.status?.toLowerCase(),
          ),
        )
        .map((o: any) => ({ label: o.name, value: String(o.id) })),
    [arrOperadores],
  );

  const selectedClient = useMemo(
    () => arrClients.find((c: any) => String(c.id) === data.clienteId),
    [arrClients, data.clienteId],
  );
  const availableSubClientes = useMemo(
    () => (selectedClient?.sub_clients || []) as unknown as SubClient[],
    [selectedClient],
  );
  const selectedSubClient = useMemo(
    () => availableSubClientes.find((s) => String(s.id) === data.subClienteId),
    [availableSubClientes, data.subClienteId],
  );
  const availableTariffs = useMemo(
    () => (selectedSubClient?.tariffs || []) as Tariff[],
    [selectedSubClient],
  );
  const selectedTariff = useMemo(
    () => availableTariffs.find((t) => String(t.id) === data.routeId),
    [availableTariffs, data.routeId],
  );

  const isFullTrip = useMemo(
    () => checkIsFullTrip(selectedTariff),
    [selectedTariff],
  );

  const infoTarifa = useMemo(() => {
    if (!selectedTariff)
      return {
        base: 0,
        casetas: 0,
        subtotal: 0,
        ivaPct: 0.16,
        retPct: 0.04,
        iva: 0,
        ret: 0,
        total: 0,
      };
    const base = Number((selectedTariff as any).tarifa_base || 0);
    const casetas = Number((selectedTariff as any).costo_casetas || 0);
    return {
      base,
      casetas,
    };
  }, [selectedTariff]);

  const downloadPdf = async (uuid: string) => {
    try {
      const response = await axiosClient.get(`/billing/invoice/${uuid}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Carta_Porte_${uuid}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast({
        title: "Descarga Exitosa",
        description: "El PDF se descargó correctamente en tu equipo.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Descarga",
        description:
          "El SAT procesó el timbre, pero el PDF tardó en generarse. Búscalo en la mesa de control.",
      });
    }
  };

  const handleCreate = async (status: TripStatus = "creado") => {
    const cleanId = (val: string) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed >= 9000 ? null : parsed;
    };

    try {
      if (status === "en_transito" && data.generarCartaPorte) {
        setIsStamping(true);
      }

      const finalStatus: TripStatus = status;

      const mercancia = data.descripcion_mercancia || "CARGA GENERAL";
      const contenedor_default = data.contenedor_1 || null;

      const payload: any = {
        client_id: parseInt(data.clienteId, 10),
        sub_client_id: parseInt(data.subClienteId, 10),
        tariff_id: cleanId(data.routeId),
        origin: data.origen || selectedClient?.razon_social || "Origen",
        destination: data.destino || selectedSubClient?.ciudad || "Destino",
        route_name: data.routeNombre || "Ruta Estándar",
        fecha_programada: data.fecha_programada
          ? data.fecha_programada.toISOString().split("T")[0]
          : null,
        descripcion_mercancia: mercancia,
        peso_toneladas: Number(data.peso_toneladas) || 0,
        es_material_peligroso: data.es_material_peligroso,
        clase_imo: data.es_material_peligroso ? data.clase_imo : null,
        contenedor_1: contenedor_default,
        contenedor_2: isFullTrip ? data.contenedor_2 : null,
        referencia: data.referencia_cliente || null,
        tarifa_base: Number(infoTarifa.base || 0),
        costo_casetas: Number(infoTarifa.casetas || 0),
        status: finalStatus,
        start_date: new Date().toISOString(),
        is_dummy_stamping: false, // Ya no usamos el bypass desde UI directa
        conoce_ruta_completa: data.conoceRutaCompleta,
        ocultar_montos_pdf: true, // Siempre ocultamos el monto en el PDF operativo
      };

      if (finalStatus !== "creado") {
        payload.initial_leg = {
          unit_id: cleanId(data.unitId) || null,
          leg_type: data.leg_type || "carga_muelle",
          operator_id: cleanId(data.driverId) || null,
          remolque_1_id: cleanId(data.remolque1Id) || null,
          dolly_id: isFullTrip ? cleanId(data.dollyId) || null : null,
          remolque_2_id: isFullTrip ? cleanId(data.remolque2Id) || null : null,
          odometro_inicial: 0,
          nivel_tanque_inicial: 0,
        };

        if (data.conoceRutaCompleta && data.generarCartaPorte) {
          payload.final_leg = {
            unit_id: cleanId(data.unit2Id) || null,
            operator_id: cleanId(data.driver2Id) || null,
            remolque_1_id: cleanId(data.remolque1Id_2) || null,
            dolly_id: isFullTrip ? cleanId(data.dollyId_2) || null : null,
            remolque_2_id: isFullTrip
              ? cleanId(data.remolque2Id_2) || null
              : null,
            leg_type: "ruta_carretera",
            odometro_inicial: 0,
            nivel_tanque_inicial: 0,
          };
        }
      }

      let resultTripId = tripId;

      if (resultTripId) {
        await axiosClient.put(
          `/api/logistics/trips/${resultTripId}/dispatch`,
          payload,
        );
      } else {
        const result = await createTrip(payload as TripCreatePayload);
        if (result && result.id) {
          setTripId(result.id);
          resultTripId = result.id;
        }
      }

      if (resultTripId) {
        if (finalStatus === "en_transito" && data.generarCartaPorte) {
          try {
            toast({
              title: "Generando Carta Porte...",
              description:
                "Vinculando viaje y timbrando documento con SAT. Por favor espera.",
            });

            // 🚀 DECISIÓN DEL MOTOR DUAL
            const isOneShot = data.conoceRutaCompleta;
            const endpoint = isOneShot
              ? "/api/sat/stamp/one-shot"
              : "/api/sat/stamp/nominal";

            const stampRes = await axiosClient.post(endpoint, {
              viaje_id: resultTripId,
              is_nominal: !isOneShot, // Si es One-Shot, es factura real
              use_dummy: false,
              ocultar_montos: true, // Siempre PDF Ciego en Dispatch
            });

            const uuid = stampRes.data?.data?.uuid || stampRes.data?.uuid;

            toast({
              title: "¡Carta Porte Timbrada Exitosamente!",
              description: isOneShot
                ? "Se consumió 1 Solo Timbre (Ruta Completa). PDF Operativo generado."
                : "Se generó CFDI Operativo ($1) para Recolección.",
            });

            if (uuid) {
              await downloadPdf(uuid);
            }
          } catch (err: any) {
            toast({
              variant: "destructive",
              title: "Viaje guardado pero falló el timbrado",
              description:
                err?.response?.data?.detail || "Revisa la mesa de control.",
            });
            return;
          }
        } else {
          toast({
            title:
              finalStatus === "en_transito"
                ? "¡Viaje Despachado!"
                : "¡Viaje Guardado en Planeación!",
            description:
              finalStatus === "en_transito"
                ? "El viaje ya se encuentra operando sin timbrar."
                : "Datos guardados correctamente.",
          });
        }

        if (onSuccess) onSuccess();
        else setTimeout(() => navigate("/Dispatch"), 1000);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail.map((d: any) => d.msg).join(", ")
        : typeof detail === "string"
          ? detail
          : "No se pudo procesar el viaje. Revisa la consola.";

      toast({
        variant: "destructive",
        title: "Error del Servidor",
        description: errorMessage,
      });
    } finally {
      setIsStamping(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/Dispatch");
  };

  const isStep1Valid = Boolean(
    data.clienteId &&
    data.subClienteId &&
    data.routeId &&
    data.fecha_programada,
  );

  const isStep2Valid = useMemo(() => {
    let isValid = Boolean(
      data.unitId &&
      data.driverId &&
      data.remolque1Id &&
      data.descripcion_mercancia &&
      data.contenedor_1,
    );
    if (isFullTrip) {
      isValid =
        isValid &&
        Boolean(data.dollyId && data.remolque2Id && data.contenedor_2);
    }

    // Validar Tramo 2 si activan el Motor Dual (1 Timbre)
    if (data.generarCartaPorte && data.conoceRutaCompleta) {
      isValid =
        isValid &&
        Boolean(data.unit2Id && data.driver2Id && data.remolque1Id_2);
      if (isFullTrip) {
        isValid = isValid && Boolean(data.dollyId_2 && data.remolque2Id_2);
      }
    }
    return isValid;
  }, [isFullTrip, data]);

  return (
    <Card className={shellClass}>
      <CardHeader className={cn(headerClass, "px-6 py-4 md:px-8")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <TahoeIconPlate tone="blue">
              <Truck className="h-6 w-6" />
            </TahoeIconPlate>
            <div>
              <CardTitle className="text-xl text-foreground">
                {tripId || initialData?.id
                  ? "PLANEAR / EDITAR Dispatch"
                  : "Dispatch WIZARD"}
              </CardTitle>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Badge
              variant={currentStep >= 1 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-1.5"
            >
              1. Ruta
            </Badge>
            <Badge
              variant={currentStep >= 2 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-1.5"
            >
              2. Operación
            </Badge>
            <Badge
              variant={currentStep === 3 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-1.5"
            >
              3. Resumen
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(bodyClass, "space-y-5 px-6 py-5 md:px-8")}>
        {/* ========================================================
            PASO 1: RUTA Y CLIENTE 
        ======================================================== */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5">
            <div className={cn(sunkPanelClass, "space-y-5")}>
              {/* Bloque Superior: Fecha */}
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-200/70 bg-blue-50/80 p-4 shadow-inner shadow-blue-100/60 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <TahoeIconPlate tone="blue" className="h-12 w-12">
                    <CalendarDays className="h-6 w-6" />
                  </TahoeIconPlate>
                  <div>
                    <Label variant="brand" required>
                      FECHA SALIDA
                    </Label>
                  </div>
                </div>
                <div className="w-full max-w-[240px]">
                  <DatePicker
                    date={data.fecha_programada}
                    onDateChange={(date) =>
                      setData((p) => ({ ...p, fecha_programada: date }))
                    }
                  />
                </div>
              </div>

              {/* FIX: Separamos en 2 columnas Cliente y Destino */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label variant="brand" required>
                    CLIENTE *
                  </Label>
                  <Select
                    value={data.clienteId}
                    onValueChange={(v) =>
                      setData((prev) => ({
                        ...prev,
                        clienteId: v,
                        subClienteId: "",
                        routeId: "",
                        routeNombre: "",
                        destino: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {arrClients.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label variant="brand" required>
                    DESTINO (SUBCLIENTE) *
                  </Label>
                  <Select
                    disabled={!data.clienteId}
                    value={data.subClienteId}
                    onValueChange={(v) => {
                      const subClient = availableSubClientes.find(
                        (s) => String(s.id) === v,
                      );
                      setData((prev) => ({
                        ...prev,
                        subClienteId: v,
                        routeId: "",
                        routeNombre: "",
                        destino:
                          subClient?.ciudad ||
                          (subClient as any)?.direccion ||
                          "",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubClientes.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.nombre} - {s.ciudad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 mt-5">
                <div className="space-y-1.5">
                  <Label variant="brand" required>
                    TARIFA / RUTA *
                  </Label>
                  <Select
                    disabled={!data.subClienteId}
                    value={data.routeId}
                    onValueChange={(v) => {
                      const tariff = availableTariffs.find(
                        (t) => String(t.id) === v,
                      ) as any;
                      const nextTipo = normalizeStr(tariff?.tipo_unidad);
                      const nextIsFull = [
                        "full",
                        "9ejes",
                        "9 ejes",
                        "doble",
                      ].includes(nextTipo);
                      setData((prev) => ({
                        ...prev,
                        routeId: v,
                        routeNombre: tariff?.nombre_ruta || "",
                        origen: tariff?.origen || "Origen",
                        anticipo_casetas: Number(tariff?.costo_casetas || 0),
                        dollyId: nextIsFull ? prev.dollyId : "",
                        remolque2Id: nextIsFull ? prev.remolque2Id : "",
                      }));
                    }}
                  >
                    <SelectTrigger className="font-black uppercase tracking-wide h-auto min-h-[2.5rem] py-2 text-left [&>span]:whitespace-normal [&>span]:line-clamp-2">
                      <SelectValue placeholder="Seleccionar ruta autorizada..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTariffs.length === 0 ? (
                        <SelectItem value="disabled" disabled>
                          Sin tarifas asignadas
                        </SelectItem>
                      ) : (
                        availableTariffs.map((t: any) => {
                          const tu = normalizeStr(t.tipo_unidad);
                          return (
                            <SelectItem
                              key={t.id}
                              value={String(t.id)}
                              className="py-2"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-900">
                                    {t.nombre_ruta}
                                  </span>
                                  <Badge
                                    variant={
                                      tu.includes("full")
                                        ? "destructive"
                                        : "success"
                                    }
                                    className="rounded-xl"
                                  >
                                    {tu
                                      ? String(t.tipo_unidad).toUpperCase()
                                      : "N/A"}
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div
              className={cn(
                footerClass,
                "flex flex-col gap-4 rounded-[20px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                onClick={handleCancel}
                className="rounded-2xl font-black uppercase tracking-[0.18em]"
              >
                Cancelar
              </Button>
              <div className="flex flex-col gap-3 md:flex-row">
                <Button
                  variant="warning"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreate("creado");
                  }}
                  disabled={!isStep1Valid}
                  className="rounded-2xl font-black uppercase tracking-[0.16em]"
                >
                  <Clock className="mr-2 h-4 w-4" /> Planeador
                </Button>
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Valid}
                  className="rounded-2xl bg-blue-600 font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700"
                >
                  Continuar a Operación{" "}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PASO 2: OPERACIÓN Y RECURSOS
        ======================================================== */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5">
            <div className={cn(sunkPanelClass, "space-y-4")}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={isFullTrip ? "destructive" : "success"}
                    className="w-fit rounded-xl px-3 py-1.5 text-xs uppercase font-black"
                  >
                    {isFullTrip ? "🚛 FULL / DOBLE" : "🚚 SENCILLO"}
                  </Badge>
                  <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      INICIA EN:
                    </span>
                    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({ ...p, leg_type: "carga_muelle" }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5",
                          data.leg_type === "carga_muelle"
                            ? "bg-brand-red text-white"
                            : "text-slate-500",
                        )}
                      >
                        <Box className="h-3 w-3" /> Patio
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({ ...p, leg_type: "ruta_carretera" }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5",
                          data.leg_type === "ruta_carretera"
                            ? "bg-blue-600 text-white"
                            : "text-slate-500",
                        )}
                      >
                        <Truck className="h-3 w-3" /> Ruta
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 pt-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label variant="brand" required>
                    MERCANCÍA (CATÁLOGO SAT)
                  </Label>
                  <SearchableSelect
                    items={availableSatProducts}
                    value={data.descripcion_mercancia.split(" ")[0]}
                    placeholder="Buscar producto SAT..."
                    onSelect={(val) => {
                      const prod = availableSatProducts.find(
                        (p) => p.value === val,
                      );
                      if (prod)
                        setData((p) => ({
                          ...p,
                          descripcion_mercancia: prod.label,
                          es_material_peligroso:
                            prod.es_material_peligroso === "1",
                          clase_imo:
                            prod.es_material_peligroso === "1"
                              ? p.clase_imo
                              : "",
                        }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="brand" required>
                    PESO (TON)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ej: 25.5"
                    className="h-10"
                    value={data.peso_toneladas || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        peso_toneladas: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label variant="brand" className="text-brand-red" required>
                    CONTENEDOR 1
                  </Label>
                  <Input
                    placeholder="Ej: CMA U 1521457"
                    value={data.contenedor_1}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        contenedor_1: e.target.value.toUpperCase(),
                      }))
                    }
                    className="border-blue-200 font-mono font-black uppercase"
                  />
                </div>
                {isFullTrip && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <Label variant="brand" className="text-brand-red" required>
                      CONTENEDOR 2
                    </Label>
                    <Input
                      placeholder="Ej: MSC U 8899221"
                      value={data.contenedor_2}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          contenedor_2: e.target.value.toUpperCase(),
                        }))
                      }
                      className="border-blue-200 font-mono font-black uppercase"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "space-y-1.5",
                    isFullTrip ? "md:col-span-1" : "md:col-span-2",
                  )}
                >
                  <Label variant="brand">REFERENCIA (OPCIONAL)</Label>
                  <Input
                    placeholder="Booking, Pedimento..."
                    value={data.referencia_cliente}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        referencia_cliente: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in slide-in-from-top-4 fade-in duration-300">
              {/* TRAMO 1: RECOLECCIÓN */}
              <div
                className={cn(
                  sectionCardClass,
                  data.conoceRutaCompleta
                    ? "border-amber-200 bg-amber-50/20 dark:bg-amber-900/10"
                    : "",
                )}
              >
                <h4
                  className={cn(
                    "text-sm font-black uppercase tracking-tighter mb-4 flex items-center gap-2 border-b pb-2",
                    data.conoceRutaCompleta
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-foreground",
                  )}
                >
                  <User
                    className={cn(
                      "h-5 w-5",
                      data.conoceRutaCompleta
                        ? "text-amber-500"
                        : "text-brand-red",
                    )}
                  />
                  {data.conoceRutaCompleta
                    ? "Tramo 1 (Recolección en Patio)"
                    : "Operador Principal"}
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      TRACTOCAMIÓN {data.conoceRutaCompleta && "RECOLECCIÓN"}
                    </Label>
                    <SearchableSelect
                      items={availableTractos}
                      value={data.unitId}
                      onSelect={(v) =>
                        setData((p) => ({
                          ...p,
                          unitId: v,
                          unit2Id: p.unit2Id === p.unitId ? v : p.unit2Id,
                        }))
                      }
                      placeholder="Buscar..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      OPERADOR {data.conoceRutaCompleta && "RECOLECCIÓN"}
                    </Label>
                    <SearchableSelect
                      items={availableOperators}
                      value={data.driverId}
                      onSelect={(v) =>
                        setData((p) => ({
                          ...p,
                          driverId: v,
                          driver2Id:
                            p.driver2Id === p.driverId ? v : p.driver2Id,
                        }))
                      }
                      placeholder="Buscar..."
                    />
                  </div>
                </div>
              </div>

              {/* ARRASTRE TRAMO 1 */}
              <div className={sectionCardClass}>
                <h4 className="text-sm font-black uppercase tracking-tighter text-foreground mb-4 flex items-center gap-2 border-b pb-2">
                  <LinkIcon className="h-5 w-5 text-blue-600" /> Arrastre{" "}
                  {data.conoceRutaCompleta && "Inicial"}
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      REMOLQUE 1
                    </Label>
                    <SearchableSelect
                      items={availableRemolques}
                      value={data.remolque1Id}
                      onSelect={(v) =>
                        setData((p) => ({
                          ...p,
                          remolque1Id: v,
                          // Sincronización automática con el Tramo 2 (Magia UX)
                          remolque1Id_2:
                            p.remolque1Id_2 === p.remolque1Id
                              ? v
                              : p.remolque1Id_2,
                        }))
                      }
                      placeholder="Buscar..."
                    />
                  </div>
                  {isFullTrip && (
                    <>
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          DOLLY
                        </Label>
                        <SearchableSelect
                          items={availableDollies}
                          value={data.dollyId}
                          onSelect={(v) =>
                            setData((p) => ({
                              ...p,
                              dollyId: v,
                              dollyId_2:
                                p.dollyId_2 === p.dollyId ? v : p.dollyId_2,
                            }))
                          }
                          placeholder="Buscar..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          REMOLQUE 2
                        </Label>
                        <SearchableSelect
                          items={availableRemolques}
                          value={data.remolque2Id}
                          onSelect={(v) =>
                            setData((p) => ({
                              ...p,
                              remolque2Id: v,
                              remolque2Id_2:
                                p.remolque2Id_2 === p.remolque2Id
                                  ? v
                                  : p.remolque2Id_2,
                            }))
                          }
                          placeholder="Buscar..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* OPCIONES DE EMISIÓN SAT (MOTOR DUAL) */}
              <div
                className={cn(
                  sectionCardClass,
                  "lg:col-span-2 border-brand-navy/20 bg-slate-50 dark:bg-slate-900/50",
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <TahoeIconPlate tone="indigo" className="h-12 w-12">
                      <ShieldCheck className="h-6 w-6 text-indigo-600" />
                    </TahoeIconPlate>
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                        Opciones de Emisión (SAT)
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        Configura cómo se generará la Carta Porte al despachar.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card p-3 rounded-2xl border border-border shadow-sm flex-1 md:flex-none">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={data.generarCartaPorte}
                        onCheckedChange={(c) => {
                          setData((p) => ({
                            ...p,
                            generarCartaPorte: c,
                            // Si lo apagan, se apaga el motor dual también
                            conoceRutaCompleta: c
                              ? p.conoceRutaCompleta
                              : false,
                          }));
                        }}
                      />
                      <Label
                        className="text-xs font-black text-foreground cursor-pointer"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            generarCartaPorte: !p.generarCartaPorte,
                            conoceRutaCompleta: !p.generarCartaPorte
                              ? p.conoceRutaCompleta
                              : false,
                          }))
                        }
                      >
                        Descargar CP al finalizar
                      </Label>
                    </div>
                    {data.generarCartaPorte && (
                      <>
                        <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={data.conoceRutaCompleta}
                            onCheckedChange={(c) =>
                              setData((p) => ({
                                ...p,
                                conoceRutaCompleta: c,
                                // Sincronizamos chasis por si acaso al prender
                                unit2Id: c ? p.unit2Id || p.unitId : p.unit2Id,
                                driver2Id: c
                                  ? p.driver2Id || p.driverId
                                  : p.driver2Id,
                                remolque1Id_2: c
                                  ? p.remolque1Id_2 || p.remolque1Id
                                  : p.remolque1Id_2,
                                dollyId_2: c
                                  ? p.dollyId_2 || p.dollyId
                                  : p.dollyId_2,
                                remolque2Id_2: c
                                  ? p.remolque2Id_2 || p.remolque2Id
                                  : p.remolque2Id_2,
                              }))
                            }
                            className="data-[state=checked]:bg-emerald-600"
                          />
                          <Label
                            className={cn(
                              "text-[10px] font-black cursor-pointer flex items-center gap-1 uppercase tracking-widest",
                              data.conoceRutaCompleta
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-slate-500",
                            )}
                            onClick={() =>
                              setData((p) => {
                                const isChecked = !p.conoceRutaCompleta;
                                return {
                                  ...p,
                                  conoceRutaCompleta: isChecked,
                                  unit2Id: isChecked
                                    ? p.unit2Id || p.unitId
                                    : p.unit2Id,
                                  driver2Id: isChecked
                                    ? p.driver2Id || p.driverId
                                    : p.driver2Id,
                                  remolque1Id_2: isChecked
                                    ? p.remolque1Id_2 || p.remolque1Id
                                    : p.remolque1Id_2,
                                  dollyId_2: isChecked
                                    ? p.dollyId_2 || p.dollyId
                                    : p.dollyId_2,
                                  remolque2Id_2: isChecked
                                    ? p.remolque2Id_2 || p.remolque2Id
                                    : p.remolque2Id_2,
                                };
                              })
                            }
                          >
                            <Award className="h-3.5 w-3.5" /> Conozco la Ruta
                            Carretera
                          </Label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TRAMO 2: RUTA CARRETERA COMPLETA */}
              {data.generarCartaPorte && data.conoceRutaCompleta && (
                <div className="lg:col-span-2 animate-in slide-in-from-top-4 fade-in duration-500">
                  <div className="rounded-[20px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-5 shadow-xl backdrop-blur-xl space-y-6">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tighter text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                        <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />{" "}
                        Tramo 2 (Tractocamión de Ruta)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label
                            variant="brand"
                            className="text-emerald-800 dark:text-emerald-300"
                            required
                          >
                            TRACTO FINAL (CARRETERA)
                          </Label>
                          <SearchableSelect
                            items={availableTractos}
                            value={data.unit2Id}
                            onSelect={(v) =>
                              setData((p) => ({ ...p, unit2Id: v }))
                            }
                            placeholder="Buscar tracto de ruta..."
                            className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            variant="brand"
                            className="text-emerald-800 dark:text-emerald-300"
                            required
                          >
                            OPERADOR FINAL (CARRETERA)
                          </Label>
                          <SearchableSelect
                            items={availableOperators}
                            value={data.driver2Id}
                            onSelect={(v) =>
                              setData((p) => ({ ...p, driver2Id: v }))
                            }
                            placeholder="Buscar operador de ruta..."
                            className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tighter text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                        <LinkIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />{" "}
                        Arrastre Final (Carretera)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                          <Label
                            variant="brand"
                            className="text-emerald-800 dark:text-emerald-300"
                            required
                          >
                            REMOLQUE 1
                          </Label>
                          <SearchableSelect
                            items={availableRemolques}
                            value={data.remolque1Id_2}
                            onSelect={(v) =>
                              setData((p) => ({ ...p, remolque1Id_2: v }))
                            }
                            placeholder="Buscar..."
                            className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                          />
                        </div>
                        {isFullTrip && (
                          <>
                            <div className="space-y-1.5">
                              <Label
                                variant="brand"
                                className="text-emerald-800 dark:text-emerald-300"
                                required
                              >
                                DOLLY
                              </Label>
                              <SearchableSelect
                                items={availableDollies}
                                value={data.dollyId_2}
                                onSelect={(v) =>
                                  setData((p) => ({ ...p, dollyId_2: v }))
                                }
                                placeholder="Buscar..."
                                className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label
                                variant="brand"
                                className="text-emerald-800 dark:text-emerald-300"
                                required
                              >
                                REMOLQUE 2
                              </Label>
                              <SearchableSelect
                                items={availableRemolques}
                                value={data.remolque2Id_2}
                                onSelect={(v) =>
                                  setData((p) => ({ ...p, remolque2Id_2: v }))
                                }
                                placeholder="Buscar..."
                                className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={cn(
                footerClass,
                "flex flex-col gap-4 rounded-[20px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                className="w-32 rounded-2xl font-black uppercase"
                onClick={() => setCurrentStep(1)}
                disabled={isStamping}
              >
                Atrás
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!isStep2Valid}
                className="rounded-2xl bg-blue-600 font-black uppercase tracking-[0.16em] text-white shadow-xl hover:bg-blue-700"
              >
                Continuar al Resumen <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            PASO 3: RESUMEN LITERAL Y TIMBRADO FINAL
        ======================================================== */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Tarjeta de Ruta */}
              <Card
                className={cn(
                  shellClass,
                  "border-blue-200/50 dark:border-blue-800/30 bg-blue-50/20 dark:bg-blue-950/10 h-full",
                )}
              >
                <CardHeader className={cn(headerClass, "pb-3 pt-4")}>
                  <div className="flex items-center gap-3">
                    <TahoeIconPlate tone="blue" className="h-10 w-10">
                      <MapPin className="h-5 w-5" />
                    </TahoeIconPlate>
                    <CardTitle className="text-sm text-blue-900 dark:text-blue-300 font-black uppercase tracking-widest">
                      Datos de la Ruta
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm text-foreground">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-bold text-muted-foreground">
                      Cliente:
                    </span>
                    <span className="font-black text-foreground text-right">
                      {selectedClient?.razon_social || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-bold text-muted-foreground">
                      Destino:
                    </span>
                    <span className="font-black text-foreground text-right">
                      {selectedSubClient?.ciudad || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="font-bold text-muted-foreground">
                      Ruta Asignada:
                    </span>
                    <span className="font-black text-blue-700 dark:text-blue-400 text-right">
                      {data.routeNombre || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="font-bold text-muted-foreground">
                      Fecha Salida:
                    </span>
                    <span className="font-black text-foreground text-right">
                      {data.fecha_programada
                        ? format(data.fecha_programada, "dd 'de' MMMM, yyyy", {
                            locale: es,
                          })
                        : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Tarjeta de Operación (RESUMEN ENRIQUECIDO) */}
              <Card
                className={cn(
                  shellClass,
                  "border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/20 dark:bg-emerald-950/10 h-full",
                )}
              >
                <CardHeader className={cn(headerClass, "pb-3 pt-4")}>
                  <div className="flex items-center gap-3">
                    <TahoeIconPlate tone="green" className="h-10 w-10">
                      <ClipboardList className="h-5 w-5" />
                    </TahoeIconPlate>
                    <CardTitle className="text-sm text-emerald-900 dark:text-emerald-300 font-black uppercase tracking-widest">
                      Asignación y Mercancía
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-sm text-foreground h-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* TRAMO 1 */}
                  <div className="space-y-2">
                    <h5 className="font-black text-brand-navy dark:text-blue-400 uppercase text-[10px] tracking-widest border-b pb-1">
                      {data.conoceRutaCompleta
                        ? "Fase 1: Recolección en Patio"
                        : "Asignación Principal"}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                        <span className="text-muted-foreground font-bold">
                          Operador:
                        </span>
                        <span className="font-black text-right">
                          {availableOperators
                            .find((o) => o.value === data.driverId)
                            ?.label?.split(" ")[0] || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                        <span className="text-muted-foreground font-bold">
                          Tracto:
                        </span>
                        <span className="font-black text-right">
                          {availableTractos
                            .find((t) => t.value === data.unitId)
                            ?.label?.split(" ")[0] || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                        <span className="text-muted-foreground font-bold">
                          Remolque 1:
                        </span>
                        <span className="font-black text-right">
                          {availableRemolques
                            .find((r) => r.value === data.remolque1Id)
                            ?.label?.split(" ")[0] || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                        <span className="text-muted-foreground font-bold">
                          Contenedor 1:
                        </span>
                        <span className="font-black text-right">
                          {data.contenedor_1 || "N/A"}
                        </span>
                      </div>

                      {isFullTrip && (
                        <>
                          <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                            <span className="text-muted-foreground font-bold">
                              Dolly:
                            </span>
                            <span className="font-black text-right">
                              {availableDollies
                                .find((d) => d.value === data.dollyId)
                                ?.label?.split(" ")[0] || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                            <span className="text-muted-foreground font-bold">
                              Remolque 2:
                            </span>
                            <span className="font-black text-right">
                              {availableRemolques
                                .find((r) => r.value === data.remolque2Id)
                                ?.label?.split(" ")[0] || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1 sm:col-span-2">
                            <span className="text-muted-foreground font-bold">
                              Contenedor 2:
                            </span>
                            <span className="font-black text-right">
                              {data.contenedor_2 || "N/A"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* TRAMO 2 */}
                  {data.generarCartaPorte && data.conoceRutaCompleta && (
                    <div className="space-y-2 pt-2 border-t border-dashed border-slate-200 dark:border-white/10">
                      <h5 className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-widest border-b border-emerald-100 dark:border-emerald-900 pb-1">
                        Fase 2: Ruta Carretera
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                          <span className="text-muted-foreground font-bold">
                            Operador:
                          </span>
                          <span className="font-black text-right">
                            {availableOperators
                              .find((o) => o.value === data.driver2Id)
                              ?.label?.split(" ")[0] || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                          <span className="text-muted-foreground font-bold">
                            Tracto:
                          </span>
                          <span className="font-black text-right">
                            {availableTractos
                              .find((t) => t.value === data.unit2Id)
                              ?.label?.split(" ")[0] || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                          <span className="text-muted-foreground font-bold">
                            Remolque 1:
                          </span>
                          <span className="font-black text-right">
                            {availableRemolques
                              .find((r) => r.value === data.remolque1Id_2)
                              ?.label?.split(" ")[0] || "N/A"}
                          </span>
                        </div>

                        {isFullTrip && (
                          <>
                            <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1">
                              <span className="text-muted-foreground font-bold">
                                Dolly:
                              </span>
                              <span className="font-black text-right">
                                {availableDollies
                                  .find((d) => d.value === data.dollyId_2)
                                  ?.label?.split(" ")[0] || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-white/10 pb-1 sm:col-span-2">
                              <span className="text-muted-foreground font-bold">
                                Remolque 2:
                              </span>
                              <span className="font-black text-right">
                                {availableRemolques
                                  .find((r) => r.value === data.remolque2Id_2)
                                  ?.label?.split(" ")[0] || "N/A"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MERCANCÍA */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1">
                    <span className="font-bold text-muted-foreground text-xs block">
                      Mercancía SAT (Peso: {data.peso_toneladas} Ton):
                    </span>
                    <span className="font-semibold text-foreground/80 text-xs line-clamp-2 leading-tight">
                      {data.descripcion_mercancia || "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div
              className={cn(
                footerClass,
                "flex flex-col gap-4 rounded-[20px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                className="w-32 rounded-2xl font-black uppercase"
                onClick={() => setCurrentStep(2)}
                disabled={isStamping}
              >
                Atrás
              </Button>
              <Button
                type="button"
                className="rounded-2xl bg-brand-navy hover:bg-slate-800 font-black uppercase tracking-[0.16em] text-white shadow-xl py-6 md:py-auto px-8 haptic-press"
                disabled={isStamping}
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("en_transito");
                }}
              >
                {isStamping ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando
                    Timbre...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />{" "}
                    {data.generarCartaPorte
                      ? "Despachar"
                      : "Confirmar sin CP (Borrador)"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
