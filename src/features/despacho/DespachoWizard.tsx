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
  RotateCcw,
  CalendarDays,
  Container,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
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

import { cn } from "@/lib/utils";

// Hooks
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { useSatCatalogs } from "@/hooks/useSatCatalogs";

// Types
import type {
  TripCreatePayload,
  SubClient,
  Tariff,
  TripStatus,
} from "@/types/api.types";

type Step = 1 | 2 | 3;

type SearchableItem = {
  label: string;
  value: string;
};

type WizardData = {
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
  contenedor: string;

  unitId: string;
  remolque1Id: string;
  dollyId: string;
  remolque2Id: string;
  driverId: string;

  leg_type: string;

  anticipo_casetas: number;
  anticipo_viaticos: number;
  anticipo_combustible: number;
};

const normalizeStr = (str?: string | null) =>
  str
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") || "";

const shellClass =
  "overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-brand-navy/95 dark:shadow-black/30";

const headerClass =
  "border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900";

const bodyClass = "bg-slate-50/50 dark:bg-transparent";

const footerClass =
  "sticky bottom-0 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl";

const sunkPanelClass =
  "rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-6 shadow-inner shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/35 dark:shadow-black/30";

const sectionCardClass =
  "rounded-[26px] border border-slate-200/70 bg-white/75 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-black/20";

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
      ? "bg-brand-red/15 text-brand-red ring-brand-red/15 dark:bg-brand-red/20 dark:text-brand-red"
      : tone === "green"
        ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-500/20 dark:text-emerald-300"
        : tone === "blue"
          ? "bg-blue-600/15 text-blue-700 ring-blue-600/15 dark:bg-blue-500/20 dark:text-blue-300"
          : tone === "amber"
            ? "bg-amber-500/15 text-amber-700 ring-amber-500/15 dark:bg-amber-500/20 dark:text-amber-300"
            : tone === "indigo"
              ? "bg-indigo-500/15 text-indigo-700 ring-indigo-500/15 dark:bg-indigo-500/20 dark:text-indigo-300"
              : "bg-slate-500/10 text-slate-700 ring-slate-500/10 dark:bg-white/10 dark:text-slate-200";

  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner ring-1 ring-inset",
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
            "h-11 w-full justify-between rounded-xl border-slate-200/80 bg-white/90 px-4 font-semibold text-slate-800 shadow-sm backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-brand-navy/95 dark:text-slate-100 dark:hover:bg-brand-navy/95",
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

      <PopoverContent className="w-[380px] p-0" align="start" sideOffset={8}>
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

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const { createTrip } = useTrips();
  const { clients } = useClients();
  const { products: satProducts } = useSatCatalogs();

  const availableSatProducts = useMemo(() => {
    return satProducts.map((p) => ({
      label: `${p.clave} - ${p.descripcion}`,
      value: p.clave,
      ...p,
    }));
  }, [satProducts]);

  const [data, setData] = useState<WizardData>({
    clienteId: "",
    subClienteId: "",
    routeId: "",
    routeNombre: "",
    origen: "",
    destino: "",
    fecha_programada: new Date(),

    descripcion_mercancia: "Carga General",
    peso_toneladas: 0,
    es_material_peligroso: false,
    clase_imo: "",
    contenedor: "",

    unitId: "",
    remolque1Id: "",
    dollyId: "",
    remolque2Id: "",
    driverId: "",

    leg_type: "carga_muelle",

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
      arrOperadores.map((o: any) => ({
        label: o.name,
        value: String(o.id),
      })),
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

  const isRoadLeg = data.leg_type === "ruta_carretera";

  const infoTarifa = useMemo(() => {
    if (!selectedTariff) {
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
    }

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
    if (!nextIsFull) {
      setData((prev) => ({ ...prev, dollyId: "", remolque2Id: "" }));
    }
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
        fecha_programada: data.fecha_programada
          ? data.fecha_programada.toISOString().split("T")[0]
          : null,

        descripcion_mercancia: data.descripcion_mercancia,
        peso_toneladas: Number(data.peso_toneladas),
        es_material_peligroso: data.es_material_peligroso,
        clase_imo: data.es_material_peligroso ? data.clase_imo : null,
        referencia: data.contenedor || null,

        tarifa_base: Number(infoTarifa.base || 0),
        costo_casetas: Number(infoTarifa.casetas || 0),
        status,
        start_date: new Date().toISOString(),
      };

      if (status !== "creado") {
        payload.remolque_1_id = cleanId(data.remolque1Id);
        payload.dolly_id = isFullTrip ? cleanId(data.dollyId) : null;
        payload.remolque_2_id = isFullTrip ? cleanId(data.remolque2Id) : null;

        payload.initial_leg = {
          unit_id: parseInt(data.unitId, 10),
          leg_type: data.leg_type,
          operator_id: parseInt(data.driverId, 10),
          odometro_inicial: 0,
          nivel_tanque_inicial: 0,
          anticipo_casetas: Number(data.anticipo_casetas || 0),
          anticipo_viaticos: Number(data.anticipo_viaticos || 0),
          anticipo_combustible: Number(data.anticipo_combustible || 0),
        };
      }

      const result = await createTrip(payload as TripCreatePayload);

      if (result) {
        toast({
          title:
            status === "en_transito"
              ? "¡Viaje Despachado!"
              : "¡Viaje en Stand-By!",
          description:
            status === "en_transito"
              ? "El viaje ya se encuentra operando."
              : "Guardado en el planeador para asignación futura.",
        });

        setTimeout(() => navigate("/despacho"), 1000);
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
    data.clienteId &&
    data.subClienteId &&
    data.routeId &&
    data.fecha_programada,
  );

  const isStep2Valid = useMemo(() => {
    const isBasicValid = Boolean(
      data.unitId &&
      data.driverId &&
      data.remolque1Id &&
      data.descripcion_mercancia &&
      data.contenedor,
    );

    const isEquipValid = isFullTrip
      ? Boolean(isBasicValid && data.dollyId && data.remolque2Id)
      : isBasicValid;

    return Boolean(isEquipValid);
  }, [isFullTrip, data]);

  return (
    <Card className={shellClass}>
      <CardHeader className={cn(headerClass, "px-6 py-5 md:px-8")}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <TahoeIconPlate tone="blue">
              <Truck className="h-7 w-7" />
            </TahoeIconPlate>

            <div className="space-y-1">
              <CardTitle className="text-xl text-slate-900 dark:text-white">
                DESPACHO WIZARD
              </CardTitle>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Planeación operativa, asignación física y salida financiera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Badge
              variant={currentStep >= 1 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-2"
            >
              1. Ruta del Cliente
            </Badge>
            <Badge
              variant={currentStep >= 2 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-2"
            >
              2. Operación y Asignación
            </Badge>
            <Badge
              variant={currentStep === 3 ? "info" : "neutral"}
              className="justify-center rounded-2xl px-4 py-2"
            >
              3. Finanzas y Egresos
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(bodyClass, "space-y-6 px-6 py-6 md:px-8")}>
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            <div className={cn(sunkPanelClass, "space-y-6")}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-3">
                  <div className="flex flex-col gap-4 rounded-[24px] border border-blue-200/70 bg-blue-50/80 p-5 shadow-inner shadow-blue-100/60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:shadow-black/20 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <TahoeIconPlate tone="blue" className="h-16 w-16">
                        <CalendarDays className="h-8 w-8" />
                      </TahoeIconPlate>

                      <div className="space-y-1">
                        <Label variant="brand" required>
                          ¿PARA CUÁNDO LO QUIERES?
                        </Label>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Fecha programada para la salida del viaje.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Usa el selector estándar y conserva trazabilidad
                          operativa.
                        </p>
                      </div>
                    </div>

                    <div className="w-full max-w-[240px]">
                      <DatePicker
                        date={data.fecha_programada}
                        onDateChange={(date) =>
                          setData((p) => ({
                            ...p,
                            fecha_programada: date,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
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

                <div className="space-y-2">
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

                <div className="space-y-2">
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
                      const nextIsFull =
                        nextTipo === "full" ||
                        nextTipo === "9ejes" ||
                        nextTipo === "9 ejes" ||
                        nextTipo === "doble";

                      setData((prev) => ({
                        ...prev,
                        routeId: v,
                        routeNombre: tariff?.nombre_ruta || "",
                        origen: tariff?.origen || "Origen",
                        anticipo_casetas: Number(tariff?.costo_casetas || 0),
                      }));

                      resetRecursosFull(nextIsFull);
                    }}
                  >
                    <SelectTrigger className="font-black uppercase tracking-wide">
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
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {t.nombre_ruta}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="rounded-xl"
                                  >
                                    {labelTipo}
                                  </Badge>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Base: $
                                  {base.toLocaleString("es-MX", {
                                    minimumFractionDigits: 2,
                                  })}{" "}
                                  | Total Neto:{" "}
                                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                                    $
                                    {total.toLocaleString("es-MX", {
                                      minimumFractionDigits: 2,
                                    })}{" "}
                                    {t.moneda}
                                  </span>
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
                "flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                onClick={() => navigate("/despacho")}
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
                  <Clock className="mr-2 h-4 w-4" />
                  Guardar en Planeador
                </Button>

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Valid}
                  className="rounded-2xl bg-blue-600 font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700"
                >
                  Asignar Operación
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            <div className={cn(sunkPanelClass, "space-y-6")}>
              <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <TahoeIconPlate tone="indigo">
                    <RotateCcw className="h-7 w-7" />
                  </TahoeIconPlate>

                  <div>
                    <h3 className="heading-crisp text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                      Preparación del Viaje
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Asignación física y configuración inicial de operación.
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isFullTrip ? "destructive" : "success"}
                  className="w-fit rounded-2xl px-4 py-2"
                >
                  {isFullTrip
                    ? "Modo: Full / Doble Articulado"
                    : "Modo: Sencillo"}
                </Badge>
              </div>

              <div className="rounded-[24px] border border-indigo-200/60 bg-indigo-50/70 p-5 shadow-inner shadow-indigo-100/60 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <TahoeIconPlate tone="indigo" className="h-14 w-14">
                    <RotateCcw className="h-6 w-6" />
                  </TahoeIconPlate>
                  <div>
                    <Label variant="brand" required>
                      MODALIDAD DE INICIO
                    </Label>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Define si el arranque es local en patio o en ruta.
                    </p>
                  </div>
                </div>

                <div className="mx-auto flex w-full max-w-[360px] rounded-[20px] border border-slate-200/80 bg-white/70 p-1.5 shadow-inner shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/30">
                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({ ...p, leg_type: "carga_muelle" }))
                    }
                    className={cn(
                      "haptic-press flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                      data.leg_type === "carga_muelle"
                        ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
                    )}
                  >
                    <Box className="h-3.5 w-3.5" />
                    Patio
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setData((p) => ({ ...p, leg_type: "ruta_carretera" }))
                    }
                    className={cn(
                      "haptic-press flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                      data.leg_type === "ruta_carretera"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
                    )}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Carretera
                  </button>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200/50 bg-white/60 px-4 py-3 dark:border-indigo-500/20 dark:bg-slate-950/50">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <p className="text-xs font-medium leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
                    {data.leg_type === "ruta_carretera"
                      ? "El sistema solicitará casetas, diésel y viáticos en el paso de Finanzas."
                      : "Movimiento local: no se requerirá registro de anticipos ni vales de diésel."}
                  </p>
                </div>
              </div>

              <div className={cn(sunkPanelClass, "space-y-5")}>
                <div className="flex items-center gap-4">
                  <TahoeIconPlate tone="blue">
                    <Box className="h-7 w-7" />
                  </TahoeIconPlate>

                  <div>
                    <h4 className="heading-crisp text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                      Información de la Mercancía
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Datos de catálogo SAT, peso estimado y referencia de
                      contenedor.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label variant="brand" required>
                      DESCRIPCIÓN DE LA CARGA (CATÁLOGO SAT) *
                    </Label>
                    <SearchableSelect
                      items={availableSatProducts}
                      value={data.descripcion_mercancia.split(" ")[0]}
                      onSelect={(val) => {
                        const prod = availableSatProducts.find(
                          (p) => p.value === val,
                        );

                        if (prod) {
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
                        }
                      }}
                      placeholder="Buscar producto SAT..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label variant="brand" required>
                      PESO ESTIMADO (TON)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ej: 25.5"
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

                <div className="space-y-2 pt-2">
                  <Label
                    variant="brand"
                    className="flex items-center gap-2 text-brand-red dark:text-brand-red"
                    required
                  >
                    <Container className="h-4 w-4" />
                    NÚMERO DE CONTENEDOR / DESGLOSE *
                  </Label>

                  <Input
                    placeholder="Ej: CMA U 1521457"
                    value={data.contenedor}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        contenedor: e.target.value.toUpperCase(),
                      }))
                    }
                    className="h-12 border-blue-200 font-mono text-lg font-black uppercase tracking-wide dark:border-blue-500/20"
                  />

                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Este número se inyectará en la descripción del concepto de
                    la Carta Porte de $1 MXN.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={sectionCardClass}>
                  <div className="mb-5 flex items-center gap-4">
                    <TahoeIconPlate tone="green">
                      <User className="h-7 w-7" />
                    </TahoeIconPlate>

                    <div>
                      <h4 className="heading-crisp text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Ejecutor del Viaje
                      </h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Operador y tractocamión asignados.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label variant="brand" required>
                        TRACTOCAMIÓN ASIGNADO *
                      </Label>
                      <SearchableSelect
                        items={availableTractos}
                        value={data.unitId}
                        onSelect={(v) => setData((p) => ({ ...p, unitId: v }))}
                        placeholder="Buscar económico o placa..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label variant="brand" required>
                        OPERADOR / CHÓFER *
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

                <div
                  className={cn(
                    sectionCardClass,
                    "bg-slate-50/80 dark:bg-slate-950/45",
                  )}
                >
                  <div className="mb-5 flex items-center gap-4">
                    <TahoeIconPlate tone="blue">
                      <LinkIcon className="h-7 w-7" />
                    </TahoeIconPlate>

                    <div>
                      <h4 className="heading-crisp text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Equipos de Arrastre
                      </h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Configuración física principal y articulada.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label variant="brand" required>
                        REMOLQUE / CHASIS 1 *
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
                        <div className="space-y-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
                          <Label variant="brand" required>
                            DOLLY (CONVERTIDOR) *
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
                          <Label variant="brand" required>
                            REMOLQUE / CHASIS 2 *
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
              </div>
            </div>

            <div
              className={cn(
                footerClass,
                "flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                size="lg"
                className="w-32 rounded-2xl"
                onClick={() => setCurrentStep(1)}
              >
                Atrás
              </Button>

              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!isStep2Valid}
                className="rounded-2xl bg-blue-600 font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700"
              >
                Continuar a Finanzas
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card
                className={cn(
                  shellClass,
                  "border-emerald-200/70 bg-emerald-50/45 dark:border-emerald-500/20 dark:bg-emerald-500/5",
                )}
              >
                <CardHeader className={cn(headerClass, "pb-4")}>
                  <div className="flex items-center gap-4">
                    <TahoeIconPlate tone="green">
                      <DollarSign className="h-7 w-7" />
                    </TahoeIconPlate>

                    <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300">
                      INGRESO GLOBAL (A FACTURAR)
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-6 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      Flete Base:
                    </span>
                    <span className="font-mono text-lg font-black text-slate-800 dark:text-white">
                      ${infoTarifa.base.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      Casetas:
                    </span>
                    <span className="font-mono text-lg font-black text-slate-800 dark:text-white">
                      ${infoTarifa.casetas.toLocaleString()}
                    </span>
                  </div>

                  <Separator className="my-4 bg-emerald-200 dark:bg-emerald-500/20" />

                  <div className="rounded-[24px] bg-emerald-600 p-5 text-white shadow-2xl shadow-emerald-600/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                        Total Neto
                      </span>
                      <span className="font-mono text-2xl font-black tracking-tighter">
                        ${infoTarifa.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isRoadLeg ? (
                <Card
                  className={cn(
                    shellClass,
                    "border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
                  )}
                >
                  <CardHeader className={cn(headerClass, "pb-4")}>
                    <div className="flex items-center gap-4">
                      <TahoeIconPlate tone="amber">
                        <Truck className="h-7 w-7" />
                      </TahoeIconPlate>

                      <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
                        ANTICIPOS PARA LA FASE INICIAL
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label variant="brand" required>
                        CASETAS
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm font-black text-slate-500 dark:text-slate-400">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-8 font-mono text-lg font-bold"
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
                      <Label variant="brand" required>
                        VALE DE DIÉSEL
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm font-black text-slate-500 dark:text-slate-400">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-8 font-mono text-lg font-bold"
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
                      <Label variant="brand" required>
                        VIÁTICOS OPERADOR
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm font-black text-slate-500 dark:text-slate-400">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-8 font-mono text-lg font-bold"
                          value={data.anticipo_viaticos || ""}
                          onChange={(e) =>
                            setData((p) => ({
                              ...p,
                              anticipo_viaticos:
                                parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  className={cn(
                    shellClass,
                    "flex min-h-[320px] flex-col items-center justify-center border-slate-200/70 bg-slate-50/70 p-10 text-center dark:border-white/10 dark:bg-slate-950/45",
                  )}
                >
                  <TahoeIconPlate tone="neutral" className="mb-4 h-16 w-16">
                    <Info className="h-8 w-8" />
                  </TahoeIconPlate>

                  <h3 className="heading-crisp text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                    Sin Anticipos
                  </h3>

                  <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Movimiento local en patio/muelle. Por políticas operativas,
                    no se requieren registros de anticipos.
                  </p>
                </Card>
              )}
            </div>

            <div
              className={cn(
                footerClass,
                "flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between",
              )}
            >
              <Button
                variant="outline"
                size="lg"
                className="w-32 rounded-2xl"
                onClick={() => setCurrentStep(2)}
              >
                Atrás
              </Button>

              <Button
                type="button"
                variant="success"
                size="lg"
                className="rounded-2xl"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreate("en_transito");
                }}
              >
                <Check className="mr-2 h-5 w-5" />
                Despachar Ahora
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
