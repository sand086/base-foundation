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

  // Recursos
  unitId: string; // Tracto
  remolque1Id: string;
  dollyId: string;
  remolque2Id: string;
  driverId: string;

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

// Utilidad para limpiar acentos y mayúsculas (Ej: "Tractocamión" -> "tractocamion")
const normalizeStr = (str?: string | null) =>
  str
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") || "";

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hooks de datos reales
  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const { createTrip } = useTrips();
  const { clients } = useClients();

  // Estado principal
  const [data, setData] = useState<WizardData>({
    clienteId: "",
    subClienteId: "",
    routeId: "",
    routeNombre: "",
    origen: "",
    destino: "",

    unitId: "",
    remolque1Id: "",
    dollyId: "",
    remolque2Id: "",
    driverId: "",

    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
  });

  // Aseguramos que la data venga como array (evita crasheos si el hook regresa null/obj)
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

  // --- FILTROS INTELIGENTES ---
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

        const esRemolque = [
          "remolque",
          "caja",
          "plataforma",
          "chasis",
          "utilitario",
        ].some((p) => strTipo1.includes(p) || strTipo.includes(p));

        return esRemolque;
      })
      .map((u: any) => ({
        label: `${u.numero_economico} - ${u.placas || "Sin placas"} (${normalizeStr(u.tipo_1)})`,
        value: String(u.id),
      }));

    if (remolquesReales.length === 0) {
      return [
        { label: "REM-PRUEBA - (No tienes remolques en BD)", value: "9998" },
        { label: "REM-PRUEBA2 - (No tienes remolques en BD)", value: "9999" },
      ];
    }
    return remolquesReales;
  }, [arrUnidades]);

  const availableDollies = useMemo(() => {
    const dolliesReales = arrUnidades
      .filter((u: any) => {
        return true;
      })
      .map((u: any) => ({
        label: `${u.numero_economico} (${normalizeStr(u.tipo_1)})`,
        value: String(u.id),
      }));

    if (dolliesReales.length === 0) {
      return [
        { label: "DOLLY-PRUEBA - (No tienes dollies en BD)", value: "9997" },
      ];
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

  // --- LÓGICA EN CASCADA: cliente -> subcliente -> tarifas ---
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

  // --- FULL dinámico por tarifa ---
  const isFullTrip = useMemo(() => {
    const tu = normalizeStr((selectedTariff as any)?.tipo_unidad);
    return tu === "full" || tu === "9ejes" || tu === "9 ejes" || tu === "doble";
  }, [selectedTariff]);

  // --- Info financiera ---
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
    const total = subtotal + iva - ret;

    return { base, casetas, subtotal, ivaPct, retPct, iva, ret, total };
  }, [selectedTariff]);

  const resetRecursosFull = (nextIsFull: boolean) => {
    if (!nextIsFull) {
      setData((prev) => ({
        ...prev,
        dollyId: "",
        remolque2Id: "",
      }));
    }
  };

  const handleCreate = async (status: TripStatus = "creado") => {
    const cleanId = (val: string) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed >= 9000) return null;
      return parsed;
    };

    try {
      const payload: TripCreatePayload = {
        client_id: parseInt(data.clienteId, 10),
        sub_client_id: parseInt(data.subClienteId, 10),
        tariff_id: cleanId(data.routeId),
        origin: data.origen || selectedClient?.razon_social || "Origen",
        destination: data.destino || selectedSubClient?.ciudad || "Destino",
        route_name: data.routeNombre || "Ruta Estándar",
        unit_id: parseInt(data.unitId, 10),
        operator_id: parseInt(data.driverId, 10),
        remolque_1_id: cleanId(data.remolque1Id),
        dolly_id: isFullTrip ? cleanId(data.dollyId) : null,
        remolque_2_id: isFullTrip ? cleanId(data.remolque2Id) : null,
        tarifa_base: Number(infoTarifa.base || 0),
        costo_casetas: Number(infoTarifa.casetas || 0),
        anticipo_casetas: Number(data.anticipo_casetas || 0),
        anticipo_viaticos: Number(data.anticipo_viaticos || 0),
        anticipo_combustible: Number(data.anticipo_combustible || 0),
        otros_anticipos: 0,
        saldo_operador: 0,
        status: status as any, // ✅ Evitamos el error estricto forzando el tipo
        start_date: new Date().toISOString(),
      };

      const result = await createTrip(payload);
      if (result) {
        toast({
          title:
            status === "en_transito"
              ? "¡Viaje Despachado!"
              : "¡Viaje en Stand-By!",
          description:
            status === "en_transito"
              ? "La unidad ya está en ruta."
              : "El viaje quedó guardado para inicio posterior.",
        });
        setTimeout(() => navigate("/trips"), 1500);
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
    if (isFullTrip) {
      return Boolean(
        data.unitId &&
        data.driverId &&
        data.remolque1Id &&
        data.dollyId &&
        data.remolque2Id,
      );
    }
    return Boolean(data.unitId && data.driverId && data.remolque1Id);
  }, [isFullTrip, data]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* STEPS */}
        <div className="flex gap-2 mb-6">
          <Badge variant={currentStep >= 1 ? "default" : "outline"}>
            1. Ruta
          </Badge>
          <Badge variant={currentStep >= 2 ? "default" : "outline"}>
            2. Recursos
          </Badge>
          <Badge variant={currentStep === 3 ? "default" : "outline"}>
            3. Finanzas
          </Badge>
        </div>

        {/* STEP 1: RUTA */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={data.clienteId}
                onValueChange={(v) => {
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
                  }));
                }}
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
          </div>
        )}

        {/* STEP 2: RECURSOS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Badge variant={isFullTrip ? "destructive" : "secondary"}>
                MODO: {isFullTrip ? "FULL / DOBLE ARTICULADO" : "SENCILLO"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Asigna los recursos. Puedes teclear para buscar.
              </span>
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
          </div>
        )}

        {/* STEP 3: FINANZAS */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-50 border-dashed border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Ingreso (A Facturar)
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
                  <Truck className="h-4 w-4 text-blue-600" />
                  Egresos (Operador)
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

        {/* NAVEGACIÓN Y BOTONES */}
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
              {/* ✅ BOTÓN STAND-BY: Usamos Button nativo */}
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

              {/* ✅ BOTÓN DESPACHAR: Usamos ActionButton pero envolvemos la función */}
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
