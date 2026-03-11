// src/features/despacho/DespachoWizard.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  ChevronRight,
  DollarSign,
  Link as LinkIcon,
  Truck,
  ChevronsUpDown,
  Clock,
  User,
  Info,
  Box,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Componentes para el Buscador (shadcn)
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
import { cn } from "@/lib/utils";

// Hooks Reales
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { useSatCatalogs } from "@/hooks/useSatCatalogs";

// Tipos Reales
import type {
  TripCreatePayload,
  SubClient,
  Tariff,
  TripStatus,
} from "@/types/api.types";

type Step = 1 | 2 | 3;

type WizardData = {
  clienteId: string;
  subClienteId: string;
  routeId: string;
  routeNombre: string;
  origen: string;
  destino: string;

  // Datos de la Mercancía
  descripcion_mercancia: string;
  peso_toneladas: number;
  es_material_peligroso: boolean;
  clase_imo: string;

  // Recursos
  unitId: string; // Tracto
  remolque1Id: string;
  dollyId: string;
  remolque2Id: string;
  driverId: string;

  leg_type: string;

  // Finanzas
  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
};

/** COMPONENTE REUTILIZABLE: Buscador Select (Combobox) 100% SEGURO */
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
  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-white"
        >
          {selectedItem ? (
            <span className="truncate">{selectedItem.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Escribe para buscar..." />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onSelect(item.value); // guardamos el ID real
                    setOpen(false);
                  }}
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

// Utilidad para limpiar acentos y mayúsculas
const normalizeStr = (str?: string | null) =>
  str
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") || "";

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const { createTrip } = useTrips();
  const { clients } = useClients();
  const { products: satProducts } = useSatCatalogs();

  // 🚀 Formatear los productos para el SearchableSelect
  const availableSatProducts = useMemo(() => {
    return satProducts.map((p) => ({
      label: `${p.clave} - ${p.descripcion}`, // Lo que ve el usuario
      value: p.clave, // Usaremos la clave para identificarlo
      ...p, // Guardamos la info extra por si acaso
    }));
  }, [satProducts]);

  const [data, setData] = useState<WizardData>({
    clienteId: "",
    subClienteId: "",
    routeId: "",
    routeNombre: "",
    origen: "",
    destino: "",

    descripcion_mercancia: "Carga General",
    peso_toneladas: 0,
    es_material_peligroso: false,
    clase_imo: "",

    unitId: "",
    remolque1Id: "",
    dollyId: "",
    remolque2Id: "",
    driverId: "",

    leg_type: "carga_muelle", // Por defecto inician yendo al patio/muelle

    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
  });

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
          const esTracto =
            searchIn.includes("tracto") || searchIn.includes("camion");
          const estaDisponible = ["disponible", "bloqueado"].includes(
            u.status?.toLowerCase(),
          );
          return esTracto && estaDisponible;
        })
        .map((u: any) => ({
          label: `${u.numero_economico} - ${u.placas || "Sin placas"} (${normalizeStr(u.tipo_1)})`,
          value: String(u.id),
        })),
    [arrUnidades],
  );

  const availableRemolques = useMemo(() => {
    const remolquesReales = arrUnidades
      .filter((u: any) => {
        const strTipo1 = normalizeStr(u.tipo_1);
        const strTipo = normalizeStr(u.tipo);
        const estaDisponible = ["disponible", "bloqueado"].includes(
          u.status?.toLowerCase(),
        );
        return (
          ["remolque", "caja", "plataforma", "chasis", "utilitario"].some(
            (p) => strTipo1.includes(p) || strTipo.includes(p),
          ) && estaDisponible
        );
      })
      .map((u: any) => {
        // LÓGICA GUSTAVO: Mostrar visualmente si el chasis tiene un "bote" arriba
        const estadoCarga = u.is_loaded ? "📦 CARGADO" : "➖ ESQUELETO VACÍO";
        return {
          label: `${u.numero_economico} - ${u.placas || "S/P"} | ${estadoCarga}`,
          value: String(u.id),
        };
      });

    if (remolquesReales.length === 0) {
      return [{ label: "No hay remolques disponibles", value: "" }];
    }
    return remolquesReales;
  }, [arrUnidades]);

  const availableDollies = useMemo(() => {
    const dolliesReales = arrUnidades
      .filter((u: any) => normalizeStr(u.tipo_1).includes("dolly"))
      .map((u: any) => ({
        label: `${u.numero_economico} (${normalizeStr(u.tipo_1)})`,
        value: String(u.id),
      }));

    if (dolliesReales.length === 0) {
      return [{ label: "DOLLY-PRUEBA - (No tienes dollies)", value: "9997" }];
    }
    return dolliesReales;
  }, [arrUnidades]);

  const availableOperators = useMemo(
    () =>
      arrOperadores.map((o: any) => ({ label: o.name, value: String(o.id) })),
    [arrOperadores],
  );

  const selectedClient = useMemo(
    () => arrClients.find((c: any) => String(c.id) === data.clienteId),
    [arrClients, data.clienteId],
  );
  const availableSubClientes = useMemo(
    () => (selectedClient?.sub_clients || []) as SubClient[],
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

  const isFullTrip = useMemo(() => {
    const tu = normalizeStr((selectedTariff as any)?.tipo_unidad);
    return tu === "full" || tu === "9ejes" || tu === "9 ejes" || tu === "doble";
  }, [selectedTariff]);

  // 🚀 REGLA DE NEGOCIO: ¿Es fase de Carretera o de Patio?
  const isRoadLeg = data.leg_type === "ruta_carretera";

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
    const subtotal = base + casetas;
    const ivaPct = Number((selectedTariff as any).iva_porcentaje ?? 16) / 100;
    const retPct =
      Number((selectedTariff as any).retencion_porcentaje ?? 4) / 100;
    const iva = subtotal * ivaPct;
    const ret = subtotal * retPct;
    return {
      base,
      casetas,
      subtotal,
      ivaPct,
      retPct,
      iva,
      ret,
      total: subtotal + iva - ret,
    };
  }, [selectedTariff]);

  const resetRecursosFull = (nextIsFull: boolean) => {
    if (!nextIsFull)
      setData((prev) => ({ ...prev, dollyId: "", remolque2Id: "" }));
  };

  const handleCreate = async (status: TripStatus = "creado") => {
    const cleanId = (val: string) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed >= 9000 ? null : parsed;
    };

    try {
      const payload: any = {
        client_id: parseInt(data.clienteId, 10),
        sub_client_id: parseInt(data.subClienteId, 10),
        tariff_id: cleanId(data.routeId),
        origin: data.origen || selectedClient?.razon_social || "Origen",
        destination: data.destino || selectedSubClient?.ciudad || "Destino",
        route_name: data.routeNombre || "Ruta Estándar",

        // DATOS DE LA MERCANCÍA
        descripcion_mercancia: data.descripcion_mercancia,
        peso_toneladas: Number(data.peso_toneladas),
        es_material_peligroso: data.es_material_peligroso,
        clase_imo: data.es_material_peligroso ? data.clase_imo : null,

        // RECURSOS FIJOS DEL VIAJE
        remolque_1_id: cleanId(data.remolque1Id),
        dolly_id: isFullTrip ? cleanId(data.dollyId) : null,
        remolque_2_id: isFullTrip ? cleanId(data.remolque2Id) : null,

        // Finanzas Globales
        tarifa_base: Number(infoTarifa.base || 0),
        costo_casetas: Number(infoTarifa.casetas || 0),

        status: status,
        start_date: new Date().toISOString(),

        // 🚀 PRIMER TRAMO (Fase Inicial)
        initial_leg: {
          unit_id: parseInt(data.unitId, 10),
          leg_type: data.leg_type,
          operator_id: parseInt(data.driverId, 10),

          // Odómetros y Telemetría ahora son null (Se manejarán en el módulo Diésel)
          odometro_inicial: null,
          nivel_tanque_inicial: null,

          // Anticipos en Ceros si es movimiento de patio
          anticipo_casetas: isRoadLeg ? Number(data.anticipo_casetas || 0) : 0,
          anticipo_viaticos: isRoadLeg
            ? Number(data.anticipo_viaticos || 0)
            : 0,
          anticipo_combustible: isRoadLeg
            ? Number(data.anticipo_combustible || 0)
            : 0,
        },
      };

      const result = await createTrip(payload as TripCreatePayload);
      if (result) {
        toast({
          title:
            status === "en_transito"
              ? "¡Viaje Despachado!"
              : "¡Viaje en Stand-By!",
          description: "Información guardada exitosamente.",
        });
        setTimeout(() => navigate("/despacho"), 1500);
      }
    } catch (error) {
      console.error("Error al despachar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el viaje. Revisa la consola.",
      });
    }
  };

  const isStep1Valid = Boolean(
    data.clienteId && data.subClienteId && data.routeId,
  );

  const isStep2Valid = useMemo(() => {
    const isBasicValid = Boolean(
      data.unitId && data.driverId && data.remolque1Id,
    );

    const isEquipValid = isFullTrip
      ? Boolean(isBasicValid && data.dollyId && data.remolque2Id)
      : isBasicValid;

    return Boolean(isEquipValid);
  }, [isFullTrip, data]);

  return (
    <Card className="shadow-lg border-slate-200">
      <CardContent className="pt-8 space-y-6">
        {/* INDICADOR DE PASOS */}
        <div className="flex gap-3 mb-8">
          <Badge
            variant={currentStep >= 1 ? "info" : "neutralSoft"}
            className="px-4 py-1.5"
          >
            1. Ruta y Mercancía
          </Badge>

          <Badge
            variant={currentStep >= 2 ? "info" : "neutralSoft"}
            className="px-4 py-1.5"
          >
            2. Asignación Física
          </Badge>

          <Badge
            variant={currentStep === 3 ? "info" : "neutralSoft"}
            className="px-4 py-1.5"
          >
            3. Finanzas y Egresos
          </Badge>
        </div>

        {/* =========================================
            PASO 1: RUTA Y MERCANCÍA
            ========================================= */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Cliente *</Label>
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
                    unitId: "",
                    remolque1Id: "",
                    dollyId: "",
                    remolque2Id: "",
                    driverId: "",
                    anticipo_casetas: 0,
                  }))
                }
              >
                <SelectTrigger className="h-12 border-slate-300">
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

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Destino (Subcliente) *
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
                      subClient?.ciudad || (subClient as any)?.direccion || "",
                    unitId: "",
                    remolque1Id: "",
                    dollyId: "",
                    remolque2Id: "",
                    driverId: "",
                    anticipo_casetas: 0,
                  }));
                }}
              >
                <SelectTrigger className="h-12 border-slate-300">
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

            <div className="space-y-2 col-span-2">
              <Label className="font-bold text-slate-700">
                Ruta y Tarifa Negociada *
              </Label>
              <Select
                disabled={!data.subClienteId}
                value={data.routeId}
                onValueChange={(v) => {
                  const tariff = availableTariffs.find(
                    (t) => String(t.id) === v,
                  ) as any;
                  const nextTipo = normalizeStr(tariff?.tipo_unidad);
                  const nextIsFull =
                    nextTipo === "full" ||
                    nextTipo === "9ejes" ||
                    nextTipo === "9 ejes" ||
                    nextTipo === "doble";
                  setData((prev) => ({
                    ...prev,
                    routeId: v,
                    routeNombre: tariff?.nombre_ruta || "",
                    anticipo_casetas: Number(tariff?.costo_casetas || 0),
                  }));
                  resetRecursosFull(nextIsFull);
                }}
              >
                <SelectTrigger className="h-12 border-slate-300 font-medium text-brand-navy">
                  <SelectValue placeholder="Seleccionar ruta autorizada..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTariffs.length === 0 ? (
                    <SelectItem value="disabled" disabled>
                      Sin tarifas asignadas al cliente
                    </SelectItem>
                  ) : (
                    availableTariffs.map((t: any) => {
                      const base = Number(t.tarifa_base || 0);
                      const casetas = Number(t.costo_casetas || 0);
                      const subtotal = base + casetas;
                      const tu = normalizeStr(t.tipo_unidad);
                      const labelTipo = tu
                        ? String(t.tipo_unidad).toUpperCase()
                        : "N/A";
                      const ivaPct =
                        Number((t as any).iva_porcentaje ?? 16) / 100;
                      const retPct =
                        Number((t as any).retencion_porcentaje ?? 4) / 100;
                      const total =
                        subtotal + subtotal * ivaPct - subtotal * retPct;
                      return (
                        <SelectItem
                          key={t.id}
                          value={String(t.id)}
                          className="py-3"
                        >
                          <span className="font-bold">{t.nombre_ruta}</span> —
                          Base: $
                          {base.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          | Total Neto:{" "}
                          <span className="text-emerald-700 font-bold">
                            $
                            {total.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>{" "}
                          {t.moneda}{" "}
                          <Badge
                            variant="outline"
                            className="ml-2 bg-slate-100"
                          >
                            {labelTipo}
                          </Badge>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 🚀 DATOS DE LA MERCANCÍA (Para Carta Porte) */}
            <div className="col-span-2 mt-4 space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="text-sm font-black text-brand-navy uppercase tracking-widest flex items-center gap-2 mb-2">
                <Box className="h-4 w-4" /> Datos de la Mercancía (Para Carta
                Porte)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Descripción de la Carga (Catálogo SAT) *</Label>
                  <SearchableSelect
                    items={availableSatProducts}
                    value={data.descripcion_mercancia.split(" ")[0]} // Tomar solo la clave si ya está guardada
                    onSelect={(val) => {
                      const selectedProd = availableSatProducts.find(
                        (p) => p.value === val,
                      );
                      if (selectedProd) {
                        const esPeligroso =
                          selectedProd.es_material_peligroso === "1";
                        setData((p) => ({
                          ...p,
                          descripcion_mercancia: selectedProd.label,
                          es_material_peligroso: esPeligroso,
                          clase_imo: esPeligroso ? p.clase_imo : "",
                        }));
                      }
                    }}
                    placeholder="Buscar producto o clave SAT..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Peso Estimado (Toneladas)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 3.5"
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t border-slate-200 mt-4">
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border shadow-sm">
                  <Switch
                    id="peligroso"
                    checked={data.es_material_peligroso}
                    onCheckedChange={(checked) =>
                      setData((p) => ({
                        ...p,
                        es_material_peligroso: checked,
                        clase_imo: checked ? p.clase_imo : "",
                      }))
                    }
                  />
                  <Label
                    htmlFor="peligroso"
                    className={`cursor-pointer ${
                      data.es_material_peligroso
                        ? "text-rose-600 font-bold"
                        : "text-slate-600 font-medium"
                    }`}
                  >
                    ¿Es Material Peligroso?
                  </Label>
                </div>

                {data.es_material_peligroso && (
                  <div className="flex-1 space-y-2 w-full">
                    <Label className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                      Clase IMO (Requerido para Hazmat)
                    </Label>
                    <Input
                      className="border-rose-300 focus-visible:ring-rose-500 bg-white"
                      placeholder="Ej: 8 - Corrosivos"
                      value={data.clase_imo}
                      onChange={(e) =>
                        setData((p) => ({ ...p, clase_imo: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: ASIGNACIÓN FÍSICA
            ========================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-800">
                  Preparación del Viaje
                </h3>
                <Badge
                  variant={isFullTrip ? "destructive" : "secondary"}
                  className="uppercase font-black"
                >
                  {isFullTrip
                    ? "MODO: FULL / DOBLE ARTICULADO"
                    : "MODO: SENCILLO"}
                </Badge>
              </div>
            </div>

            {/* SELECCIÓN DE FASE */}
            <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
              <Label className="text-sm font-black text-indigo-900 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                <Clock className="h-5 w-5" /> Fase Inicial del Viaje:
              </Label>
              <Select
                value={data.leg_type}
                onValueChange={(val) =>
                  setData((p) => ({ ...p, leg_type: val }))
                }
              >
                <SelectTrigger className="h-12 text-sm font-bold bg-white border-indigo-200 w-full max-w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="carga_muelle"
                    className="font-bold text-indigo-900 py-3"
                  >
                    1. Carga Inicial (Movimiento en Puerto / Patio)
                  </SelectItem>
                  <SelectItem
                    value="ruta_carretera"
                    className="font-bold text-emerald-900 py-3"
                  >
                    2. Ruta Directa (Viaje a Destino por Carretera)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ASIGNACIÓN DE CHASIS (Fijos para todo el viaje) */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-sm font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
                    <Box className="h-4 w-4" /> Equipos de Arrastre
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Estos chasis amparan la carga durante TODO el viaje.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold text-slate-700">
                      <LinkIcon className="h-3.5 w-3.5" /> Remolque / Chasis 1 *
                    </Label>
                    <SearchableSelect
                      items={availableRemolques}
                      value={data.remolque1Id}
                      onSelect={(v) =>
                        setData((p) => ({ ...p, remolque1Id: v }))
                      }
                      placeholder="Buscar económico..."
                    />
                  </div>

                  {isFullTrip && (
                    <>
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <Label className="flex items-center gap-2 font-bold text-rose-600">
                          <LinkIcon className="h-3.5 w-3.5" /> Dolly
                          (Convertidor) *
                        </Label>
                        <SearchableSelect
                          items={availableDollies}
                          value={data.dollyId}
                          onSelect={(v) =>
                            setData((p) => ({ ...p, dollyId: v }))
                          }
                          placeholder="Buscar económico del dolly..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 font-bold text-rose-600">
                          <LinkIcon className="h-3.5 w-3.5" /> Remolque / Chasis
                          2 *
                        </Label>
                        <SearchableSelect
                          items={availableRemolques}
                          value={data.remolque2Id}
                          onSelect={(v) =>
                            setData((p) => ({ ...p, remolque2Id: v }))
                          }
                          placeholder="Buscar económico..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ASIGNACIÓN DEL TRACTO Y OPERADOR (Solo para esta fase) */}
              <div className="space-y-6">
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <User className="h-4 w-4" /> Ejecutor de la Fase Inicial
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Este operador y tractor pueden ser relevados más adelante.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">
                        Tractocamión Asignado *
                      </Label>
                      <SearchableSelect
                        items={availableTractos}
                        value={data.unitId}
                        onSelect={(v) => setData((p) => ({ ...p, unitId: v }))}
                        placeholder="Buscar económico o placa..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">
                        Operador / Chófer *
                      </Label>
                      <SearchableSelect
                        items={availableOperators}
                        value={data.driverId}
                        onSelect={(v) =>
                          setData((p) => ({ ...p, driverId: v }))
                        }
                        placeholder="Buscar por nombre..."
                      />
                    </div>
                  </div>
                </div>

                {/* 🚀 ELIMINAMOS TELEMETRÍA (Odómetro/Combustible se van al Módulo de Combustible) */}
                <div className="p-5 rounded-2xl border border-slate-200 opacity-70 bg-slate-50 flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-full flex justify-center items-center shrink-0">
                    <Info className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Nota Operativa:</strong> La telemetría (Odómetros y
                    Niveles de Diésel) ya no se registra en el despacho. Se debe
                    registrar directamente en el{" "}
                    <strong>Módulo de Combustible</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            PASO 3: FINANZAS Y EGRESOS
            ========================================= */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            {/* INGRESOS DEL VIAJE */}
            <Card className="bg-slate-50 border-2 border-emerald-100 shadow-sm h-fit">
              <CardHeader className="pb-4 bg-white border-b rounded-t-xl">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-800">
                  <DollarSign className="h-5 w-5" /> Ingreso Global (A Facturar)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">Flete Base:</span>
                  <span className="font-black text-slate-800 font-mono text-lg">
                    $
                    {infoTarifa.base.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">
                    Casetas (Cobro a Cliente):
                  </span>
                  <span className="font-black text-slate-800 font-mono text-lg">
                    $
                    {infoTarifa.casetas.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Separator className="my-4 bg-emerald-200" />
                <div className="flex justify-between font-black text-slate-600">
                  <span>Subtotal Antes de Impuestos:</span>
                  <span className="font-mono">
                    $
                    {infoTarifa.subtotal.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-6 bg-emerald-500 p-5 rounded-2xl text-white shadow-lg">
                  <span className="font-black uppercase tracking-widest">
                    TOTAL NETO:
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tighter">
                    $
                    {infoTarifa.total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 🚀 EGRESOS CONDICIONALES */}
            {isRoadLeg ? (
              <Card className="border-2 border-amber-200 bg-amber-50/50 shadow-sm h-fit">
                <CardHeader className="pb-4 bg-white border-b border-amber-100 rounded-t-xl">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-amber-700">
                    <Truck className="h-5 w-5" /> Anticipos para la Fase Inicial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">
                      Adelanto para Casetas
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 font-bold">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8 font-mono text-lg bg-white"
                        value={data.anticipo_casetas || ""}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            anticipo_casetas: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">
                      Vale de Diésel
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 font-bold">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8 font-mono text-lg bg-white"
                        value={data.anticipo_combustible || ""}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            anticipo_combustible:
                              parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">
                      Viáticos Operador
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 font-bold">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8 font-mono text-lg bg-white"
                        value={data.anticipo_viaticos || ""}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            anticipo_viaticos: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col justify-center items-center text-center p-10 h-full min-h-[300px]">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Info className="h-8 w-8 text-brand-navy" />
                </div>
                <h3 className="text-lg font-black text-brand-navy uppercase tracking-widest">
                  Sin Anticipos
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">
                  Has seleccionado una fase de movimiento local en patio/muelle.
                  Por políticas operativas, no se requieren registros de
                  anticipos por viaje para estos operadores.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* NAVEGACIÓN INFERIOR */}
        <div className="flex justify-between pt-8 border-t mt-8">
          <Button
            variant="outline"
            size="lg"
            className="font-bold w-32"
            onClick={() => setCurrentStep((p) => (p - 1) as Step)}
            disabled={currentStep === 1}
          >
            Atrás
          </Button>

          {currentStep < 3 ? (
            <ActionButton
              className="font-black px-8"
              onClick={() => setCurrentStep((p) => (p + 1) as Step)}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid)
              }
            >
              Continuar <ChevronRight className="h-5 w-5 ml-2" />
            </ActionButton>
          ) : (
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("creado");
                }}
                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold"
              >
                <Clock className="h-5 w-5 mr-2" /> Guardar en Stand-By
              </Button>
              <ActionButton
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black px-8 text-white"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("en_transito");
                }}
              >
                <Check className="h-5 w-5 mr-2" /> DESPACHAR AHORA
              </ActionButton>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
