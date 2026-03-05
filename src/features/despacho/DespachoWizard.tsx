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
  Gauge,
  Droplets,
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
import { Switch } from "@/components/ui/switch"; // <-- NUEVO IMPORT PARA LA MERCANCÍA PELIGROSA

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

  //  Datos de la Mercancía
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

  // Lecturas Iniciales (Vital para liquidación)
  odometro_inicial: number;
  nivel_tanque_inicial: number;

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
            selectedItem.label
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

    // Inicializar Mercancía
    descripcion_mercancia: "Carga General",
    peso_toneladas: 0,
    es_material_peligroso: false,
    clase_imo: "",

    unitId: "",
    remolque1Id: "",
    dollyId: "",
    remolque2Id: "",
    driverId: "",

    leg_type: "carga_muelle",

    odometro_inicial: 0,
    nivel_tanque_inicial: 100,

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
        //  LÓGICA GUSTAVO: Mostrar visualmente si el chasis tiene un "bote" arriba
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
      .filter((u: any) => true)
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

    // Validación Básica
    if (!data.odometro_inicial || data.odometro_inicial <= 0) {
      toast({
        variant: "destructive",
        title: "Falta Odómetro",
        description: "Por favor, ingresa el odómetro inicial de la unidad.",
      });
      return;
    }

    try {
      // Usamos `any` temporalmente para que TS no llore si no has actualizado api.types.ts
      const payload: any = {
        client_id: parseInt(data.clienteId, 10),
        sub_client_id: parseInt(data.subClienteId, 10),
        tariff_id: cleanId(data.routeId),
        origin: data.origen || selectedClient?.razon_social || "Origen",
        destination: data.destino || selectedSubClient?.ciudad || "Destino",
        route_name: data.routeNombre || "Ruta Estándar",

        // 🚀 DATOS DE LA MERCANCÍA (Para Carta Porte)
        descripcion_mercancia: data.descripcion_mercancia,
        peso_toneladas: Number(data.peso_toneladas),
        es_material_peligroso: data.es_material_peligroso,
        clase_imo: data.es_material_peligroso ? data.clase_imo : null,

        remolque_1_id: cleanId(data.remolque1Id),
        dolly_id: isFullTrip ? cleanId(data.dollyId) : null,
        remolque_2_id: isFullTrip ? cleanId(data.remolque2Id) : null,

        // Finanzas Globales del Viaje
        tarifa_base: Number(infoTarifa.base || 0),
        costo_casetas: Number(infoTarifa.casetas || 0),

        status: status,
        start_date: new Date().toISOString(),

        // El primer tramo envuelto
        initial_leg: {
          // Por defecto, asume que el primer paso es ir al muelle
          unit_id: parseInt(data.unitId, 10),
          leg_type: data.leg_type,
          operator_id: parseInt(data.driverId, 10),
          odometro_inicial: Number(data.odometro_inicial),
          nivel_tanque_inicial: Number(data.nivel_tanque_inicial),
          anticipo_casetas: Number(data.anticipo_casetas || 0),
          anticipo_viaticos: Number(data.anticipo_viaticos || 0),
          anticipo_combustible: Number(data.anticipo_combustible || 0),
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
    const baseValido = Boolean(
      data.unitId &&
      data.driverId &&
      data.remolque1Id &&
      data.odometro_inicial > 0,
    );
    if (isFullTrip)
      return Boolean(baseValido && data.dollyId && data.remolque2Id);
    return baseValido;
  }, [isFullTrip, data]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex gap-2 mb-6">
          <Badge variant={currentStep >= 1 ? "default" : "outline"}>
            1. Ruta y Mercancía
          </Badge>
          <Badge variant={currentStep >= 2 ? "default" : "outline"}>
            2. Recursos
          </Badge>
          <Badge variant={currentStep === 3 ? "default" : "outline"}>
            3. Finanzas
          </Badge>
        </div>

        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
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

            <div className="space-y-2">
              <Label>Destino</Label>
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

            <div className="space-y-2 col-span-2">
              <Label>Ruta y Tarifa</Label>
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
                <SelectTrigger>
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
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre_ruta} — Base: $
                          {base.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          | Total Neto: $
                          {total.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          {t.moneda} ({labelTipo})
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 🚀 NUEVA SECCIÓN: DATOS DE LA MERCANCÍA */}
            <div className="col-span-2 mt-4 space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="text-sm font-bold text-brand-navy flex items-center gap-2">
                Datos de la Mercancía (Para Carta Porte)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descripción de la Carga (Catálogo SAT) *</Label>
                  <SearchableSelect
                    items={availableSatProducts}
                    value={data.descripcion_mercancia.split(" ")[0]} // Tomar solo la clave si ya está guardada
                    onSelect={(val) => {
                      // Buscar el producto original para auto-completar si es peligroso
                      const selectedProd = availableSatProducts.find(
                        (p) => p.value === val,
                      );
                      if (selectedProd) {
                        const esPeligroso =
                          selectedProd.es_material_peligroso === "1";
                        setData((p) => ({
                          ...p,
                          // Guardamos la cadena combinada para el PDF: "Clave - Descripción"
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

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center space-x-2">
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
                    className={
                      data.es_material_peligroso
                        ? "text-rose-600 font-bold"
                        : ""
                    }
                  >
                    ¿Es Material Peligroso?
                  </Label>
                </div>

                {data.es_material_peligroso && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-rose-600">
                      Clase IMO (Ej: 8 - Corrosivos)
                    </Label>
                    <Input
                      className="h-8 border-rose-200"
                      placeholder="Indique la clase IMO..."
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

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b">
              <Badge variant={isFullTrip ? "destructive" : "secondary"}>
                MODO: {isFullTrip ? "FULL / DOBLE ARTICULADO" : "SENCILLO"}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> El odómetro es obligatorio
              </span>
            </div>
            <div className="flex items-center gap-3 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              <Label className="text-xs font-bold text-indigo-800 uppercase tracking-wider whitespace-nowrap">
                Fase Inicial:
              </Label>
              <Select
                value={data.leg_type}
                onValueChange={(val) =>
                  setData((p) => ({ ...p, leg_type: val }))
                }
              >
                <SelectTrigger className="h-8 text-xs bg-white border-indigo-200 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="carga_muelle"
                    className="font-medium text-indigo-900"
                  >
                    1. Carga (Muelle / Patio)
                  </SelectItem>
                  <SelectItem
                    value="ruta_carretera"
                    className="font-medium text-emerald-900"
                  >
                    2. Ruta Directa (Carretera)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tractocamión ({availableTractos.length}) *</Label>
                <SearchableSelect
                  items={availableTractos}
                  value={data.unitId}
                  onSelect={(v) => setData((p) => ({ ...p, unitId: v }))}
                  placeholder="Buscar económico o placa..."
                />
              </div>

              <div className="space-y-2">
                <Label>Operador *</Label>
                <SearchableSelect
                  items={availableOperators}
                  value={data.driverId}
                  onSelect={(v) => setData((p) => ({ ...p, driverId: v }))}
                  placeholder="Buscar operador por nombre..."
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> Remolque 1 *
                </Label>
                <SearchableSelect
                  items={availableRemolques}
                  value={data.remolque1Id}
                  onSelect={(v) => setData((p) => ({ ...p, remolque1Id: v }))}
                  placeholder="Buscar económico de remolque..."
                />
              </div>

              {isFullTrip && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-rose-600">
                      <LinkIcon className="h-3 w-3" /> Dolly (Convertidor) *
                    </Label>
                    <SearchableSelect
                      items={availableDollies}
                      value={data.dollyId}
                      onSelect={(v) => setData((p) => ({ ...p, dollyId: v }))}
                      placeholder="Buscar económico del dolly..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-rose-600">
                      <LinkIcon className="h-3 w-3" /> Remolque 2 (Trasero) *
                    </Label>
                    <SearchableSelect
                      items={availableRemolques}
                      value={data.remolque2Id}
                      onSelect={(v) =>
                        setData((p) => ({ ...p, remolque2Id: v }))
                      }
                      placeholder="Buscar económico de remolque..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* 🚀 LECTURAS INICIALES (ODÓMETRO Y COMBUSTIBLE) */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t bg-slate-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-brand-navy">
                  <Gauge className="h-4 w-4" /> Odómetro Inicial (km) *
                </Label>
                <Input
                  type="number"
                  value={data.odometro_inicial || ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      odometro_inicial: Number(e.target.value),
                    }))
                  }
                  placeholder="Ej: 250400"
                  className="font-mono text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-brand-navy">
                  <Droplets className="h-4 w-4" /> Nivel Tanque Inicial (%) *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.nivel_tanque_inicial}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        nivel_tanque_inicial: Number(e.target.value),
                      }))
                    }
                    className="font-mono text-lg pr-8"
                    required
                  />
                  <span className="absolute right-3 top-3 font-bold text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-50 border-dashed border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Ingreso (A
                  Facturar)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flete Base:</span>
                  <span className="font-medium text-slate-700">
                    $
                    {infoTarifa.base.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Casetas (Cobro a Cliente):
                  </span>
                  <span className="font-medium text-slate-700">
                    $
                    {infoTarifa.casetas.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Subtotal:</span>
                  <span>
                    $
                    {infoTarifa.subtotal.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 bg-emerald-100 p-3 rounded-lg text-emerald-800 font-bold">
                  <span>TOTAL NETO:</span>
                  <span className="text-lg">
                    $
                    {infoTarifa.total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" /> Egresos (Operador)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Anticipo Casetas</Label>
                  <Input
                    type="number"
                    value={data.anticipo_casetas}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        anticipo_casetas: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anticipo Diésel</Label>
                  <Input
                    type="number"
                    value={data.anticipo_combustible}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        anticipo_combustible: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Viáticos</Label>
                  <Input
                    type="number"
                    value={data.anticipo_viaticos}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        anticipo_viaticos: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((p) => (p - 1) as Step)}
            disabled={currentStep === 1}
          >
            Atrás
          </Button>
          {currentStep < 3 ? (
            <ActionButton
              onClick={() => setCurrentStep((p) => (p + 1) as Step)}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid)
              }
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </ActionButton>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("creado");
                }}
                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              >
                <Clock className="h-4 w-4 mr-2" /> Guardar en Stand-By
              </Button>
              <ActionButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("en_transito");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100"
              >
                <Check className="h-4 w-4 mr-2" /> Despachar Ahora
              </ActionButton>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
