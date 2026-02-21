import { useState, useMemo } from "react";
import {
  Truck,
  MapPin,
  User,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  Building2,
  Route,
  Wallet,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// IMPORTAR TUS HOOKS REALES
import { useUnits } from "@/hooks/useUnits";
import { useClients } from "@/hooks/useClients";
import { useOperators } from "@/hooks/useOperators";

type WizardStep = 1 | 2 | 3;

interface DispatchData {
  clienteId: number | "";
  clienteNombre: string;
  subClienteId: number | "";
  subClienteNombre: string;
  tarifaId: number | "";
  tarifaSeleccionada: any | null;
  unidadId: number | "";
  unidadNumero: string;
  operadorId: number | "";
  operadorNombre: string;
  anticipoCasetas: number;
  anticipoViaticos: number;
  anticipoCombustible: number;
  observaciones: string;
}

const initialData: DispatchData = {
  clienteId: "",
  clienteNombre: "",
  subClienteId: "",
  subClienteNombre: "",
  tarifaId: "",
  tarifaSeleccionada: null,
  unidadId: "",
  unidadNumero: "",
  operadorId: "",
  operadorNombre: "",
  anticipoCasetas: 0,
  anticipoViaticos: 0,
  anticipoCombustible: 0,
  observaciones: "",
};

// --- HELPERS TRASLADADOS (Para evitar dependencias muertas) ---
const formatCurrency = (amount: number, currency: string = "MXN") => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const getUnitTypeEmoji = (type: string) => {
  const map: Record<string, string> = {
    sencillo: "🚛",
    full: "🚚",
    rabon: "🚐",
    tractocamion: "🚜",
  };
  return map[type?.toLowerCase()] || "🚛";
};

const getUnitTypeLabel = (type: string) => {
  if (!type) return "Desconocido";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const getExpiryStatus = (dateStr?: string) => {
  if (!dateStr) return "danger";
  const days = Math.floor(
    (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
  );
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
};

const getExpiryLabel = (dateStr?: string) => {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString("es-MX", { timeZone: "UTC" });
};
// ----------------------------------------------------------------

export default function DespachoNuevo() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [data, setData] = useState<DispatchData>(initialData);

  // === CONSUMO DE DATOS REALES ===
  const { unidades } = useUnits();
  const { clients } = useClients();
  const { operadores } = useOperators(); // <-- Coincide con tu export const useOperators = () => { operadores, ... }

  // ============= STEP 1: Derived Data from Clients =============
  const subClientesDisponibles = useMemo(() => {
    if (!data.clienteId) return [];
    const cliente = clients.find((c: any) => c.id === data.clienteId);
    return (
      cliente?.sub_clients?.filter((sc: any) => sc.estatus === "activo") || []
    );
  }, [data.clienteId, clients]);

  const tarifasDisponibles = useMemo(() => {
    if (!data.subClienteId) return [];
    const subCliente = subClientesDisponibles.find(
      (sc: any) => sc.id === data.subClienteId,
    );
    return (
      subCliente?.tariffs?.filter(
        (t: any) => t.estatus === "activa" || t.estatus === "ACTIVA",
      ) || []
    );
  }, [data.subClienteId, subClientesDisponibles]);

  const subClienteActual = useMemo(() => {
    return subClientesDisponibles.find(
      (sc: any) => sc.id === data.subClienteId,
    );
  }, [data.subClienteId, subClientesDisponibles]);

  // ============= STEP 2: Derived Data from Fleet =============
  const unidadesDisponibles = useMemo(() => {
    if (!data.tarifaSeleccionada) return [];
    return unidades.filter(
      (u) =>
        (u.status === "disponible" || u.status === "DISPONIBLE") &&
        u.tipo?.toLowerCase() ===
          data.tarifaSeleccionada.tipo_unidad?.toLowerCase(),
    );
  }, [data.tarifaSeleccionada, unidades]);

  const noUnitsAvailable = useMemo(() => {
    return data.tarifaSeleccionada && unidadesDisponibles.length === 0;
  }, [data.tarifaSeleccionada, unidadesDisponibles]);

  const operadoresDisponibles = useMemo(() => {
    return operadores.filter(
      (op: any) =>
        (op.status === "activo" || op.status === "ACTIVO") &&
        !op.assigned_unit_id, // Que no tenga unidad ya asignada
    );
  }, [operadores]);

  // ============= STEP 3: Financial Calculations =============
  const totalAnticipos = useMemo(() => {
    return (
      data.anticipoCasetas + data.anticipoViaticos + data.anticipoCombustible
    );
  }, [data.anticipoCasetas, data.anticipoViaticos, data.anticipoCombustible]);

  const saldoOperador = useMemo(() => {
    if (!data.tarifaSeleccionada) return 0;
    return (data.tarifaSeleccionada.tarifa_base || 0) - totalAnticipos;
  }, [data.tarifaSeleccionada, totalAnticipos]);

  // ============= HANDLERS =============
  const handleClienteChange = (val: string) => {
    const clienteId = Number(val);
    const cliente = clients.find((c: any) => c.id === clienteId);
    setData((prev) => ({
      ...prev,
      clienteId,
      clienteNombre: cliente?.razon_social || "",
      subClienteId: "",
      subClienteNombre: "",
      tarifaId: "",
      tarifaSeleccionada: null,
      unidadId: "",
      unidadNumero: "",
    }));
  };

  const handleSubClienteChange = (val: string) => {
    const subClienteId = Number(val);
    const subCliente = subClientesDisponibles.find(
      (sc: any) => sc.id === subClienteId,
    );
    setData((prev) => ({
      ...prev,
      subClienteId,
      subClienteNombre: subCliente?.nombre || "",
      tarifaId: "",
      tarifaSeleccionada: null,
      unidadId: "",
      unidadNumero: "",
    }));
  };

  const handleTarifaChange = (val: string) => {
    const tarifaId = Number(val);
    const tarifa = tarifasDisponibles.find((t: any) => t.id === tarifaId);
    setData((prev) => ({
      ...prev,
      tarifaId,
      tarifaSeleccionada: tarifa || null,
      unidadId: "",
      unidadNumero: "",
      anticipoCasetas: tarifa?.costo_casetas || 0,
    }));
  };

  const handleUnidadChange = (val: string) => {
    const unidadId = Number(val);
    const unidad = unidadesDisponibles.find((u) => u.id === unidadId);
    setData((prev) => ({
      ...prev,
      unidadId,
      unidadNumero: unidad?.numero_economico || "",
    }));
  };

  const handleOperadorChange = (val: string) => {
    const operadorId = Number(val);
    const operador = operadoresDisponibles.find(
      (op: any) => op.id === operadorId,
    );
    setData((prev) => ({
      ...prev,
      operadorId,
      operadorNombre: operador?.name || "", // o op.nombre si es que así viene en tu schema final
    }));
  };

  const handleConfirmDispatch = () => {
    console.log("Dispatch Data Listos para BD:", data);
    toast({
      title: "Viaje Despachado",
      description: `Carta Porte generada para ${data.unidadNumero} - Ruta: ${data.tarifaSeleccionada?.nombre_ruta}`,
    });
    setData(initialData);
    setCurrentStep(1);
  };

  // ============= VALIDATION =============
  const isStep1Valid = Boolean(
    data.clienteId && data.subClienteId && data.tarifaId,
  );
  const isStep2Valid = Boolean(data.unidadId && data.operadorId);
  const canProceed =
    currentStep === 1 ? isStep1Valid : currentStep === 2 ? isStep2Valid : true;

  const steps = [
    { step: 1, label: "Ruta y Tarifa", icon: Route },
    { step: 2, label: "Recursos", icon: Truck },
    { step: 3, label: "Financiero", icon: Wallet },
  ];

  const getOperatorStatusBadge = (operador: any) => {
    const licenseStatus = getExpiryStatus(operador.license_expiry);
    const medicalStatus = getExpiryStatus(operador.medical_check_expiry);

    if (licenseStatus === "danger" || medicalStatus === "danger") {
      return (
        <Badge className="bg-status-danger text-white text-xs">
          {getExpiryLabel(
            licenseStatus === "danger"
              ? operador.license_expiry
              : operador.medical_check_expiry,
          )}
        </Badge>
      );
    }
    if (licenseStatus === "warning" || medicalStatus === "warning") {
      return (
        <Badge className="bg-status-warning text-black text-xs">
          {getExpiryLabel(
            licenseStatus === "warning"
              ? operador.license_expiry
              : operador.medical_check_expiry,
          )}
        </Badge>
      );
    }
    return (
      <Badge className="bg-status-success text-white text-xs">Vigente</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Mesa de Control - Nuevo Despacho
          </h1>
          <p className="text-muted-foreground">
            Asigna viajes integrando tarifas de clientes y recursos de flota
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-4">
        {steps.map((s, index) => (
          <div key={s.step} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                currentStep === s.step
                  ? "bg-primary text-primary-foreground font-semibold"
                  : currentStep > s.step
                    ? "bg-status-success/20 text-status-success"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > s.step ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <s.icon className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="h-5 w-5 text-muted-foreground mx-2" />
            )}
          </div>
        ))}
      </div>

      <Card className="border-2">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && (
              <>
                <Route className="h-5 w-5" /> Paso 1: Selección de Ruta y Tarifa
              </>
            )}
            {currentStep === 2 && (
              <>
                <Truck className="h-5 w-5" /> Paso 2: Asignación de Recursos
              </>
            )}
            {currentStep === 3 && (
              <>
                <Wallet className="h-5 w-5" /> Paso 3: Resumen Financiero
              </>
            )}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 &&
              "Selecciona el cliente, destino y la tarifa autorizada para este viaje"}
            {currentStep === 2 && "Asigna la unidad y el operador disponibles"}
            {currentStep === 3 &&
              "Configura los anticipos y revisa el resumen del viaje"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* ============= STEP 1 ============= */}
          {currentStep === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Cliente
                  </Label>
                  <Select
                    value={data.clienteId.toString()}
                    onValueChange={handleClienteChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients
                        .filter(
                          (c: any) =>
                            c.estatus === "activo" || c.estatus === "ACTIVO",
                        )
                        .map((cliente: any) => (
                          <SelectItem
                            key={cliente.id}
                            value={cliente.id.toString()}
                          >
                            <div className="flex flex-col">
                              <span>{cliente.razon_social}</span>
                              <span className="text-xs text-muted-foreground">
                                {cliente.rfc}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Destino (SubCliente)
                  </Label>
                  <Select
                    value={data.subClienteId.toString()}
                    onValueChange={handleSubClienteChange}
                    disabled={!data.clienteId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          data.clienteId
                            ? "Selecciona destino..."
                            : "Primero selecciona cliente"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subClientesDisponibles.map((sc: any) => (
                        <SelectItem key={sc.id} value={sc.id.toString()}>
                          <div className="flex flex-col">
                            <span>{sc.nombre}</span>
                            <span className="text-xs text-muted-foreground">
                              {sc.ciudad}, {sc.estado}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Route className="h-4 w-4" /> Ruta y Tarifa Autorizada
                  </Label>
                  <Select
                    value={data.tarifaId.toString()}
                    onValueChange={handleTarifaChange}
                    disabled={!data.subClienteId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          data.subClienteId
                            ? "Selecciona ruta/tarifa..."
                            : "Primero selecciona destino"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tarifasDisponibles.length === 0 && data.subClienteId ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-status-warning" />
                          <p className="text-sm">
                            No hay tarifas configuradas para este destino
                          </p>
                        </div>
                      ) : (
                        tarifasDisponibles.map((tarifa: any) => (
                          <SelectItem
                            key={tarifa.id}
                            value={tarifa.id.toString()}
                          >
                            <div className="flex items-center gap-3">
                              <span>
                                {getUnitTypeEmoji(tarifa.tipo_unidad)}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {tarifa.nombre_ruta}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {getUnitTypeLabel(tarifa.tipo_unidad)} •{" "}
                                  {formatCurrency(
                                    tarifa.tarifa_base,
                                    tarifa.moneda,
                                  )}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                {data.tarifaSeleccionada && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" /> Tarifa
                        Seleccionada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ruta:</span>
                        <span className="font-medium">
                          {data.tarifaSeleccionada.nombre_ruta}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Tipo Unidad Requerido:
                        </span>
                        <Badge variant="outline" className="gap-1">
                          {getUnitTypeEmoji(
                            data.tarifaSeleccionada.tipo_unidad,
                          )}{" "}
                          {getUnitTypeLabel(
                            data.tarifaSeleccionada.tipo_unidad,
                          )}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Tarifa Base:
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(
                            data.tarifaSeleccionada.tarifa_base,
                            data.tarifaSeleccionada.moneda,
                          )}
                        </span>
                      </div>
                      {data.tarifaSeleccionada.costo_casetas > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Casetas (Est.):
                          </span>
                          <span>
                            {formatCurrency(
                              data.tarifaSeleccionada.costo_casetas,
                              data.tarifaSeleccionada.moneda,
                            )}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {subClienteActual && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" /> Condiciones Comerciales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Días de Crédito:
                        </span>
                        <Badge variant="secondary">
                          {subClienteActual.dias_credito || 0} días
                        </Badge>
                      </div>
                      {subClienteActual.convenio_especial && (
                        <div className="flex items-center gap-2 text-status-warning">
                          <ShieldAlert className="h-4 w-4" />
                          <span>Convenio Especial Activo</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ============= STEP 2 ============= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {noUnitsAvailable && (
                <Alert className="border-status-warning bg-status-warning/10">
                  <AlertTriangle className="h-5 w-5 text-status-warning" />
                  <AlertTitle className="text-status-warning">
                    Sin Unidades Disponibles
                  </AlertTitle>
                  <AlertDescription>
                    No hay unidades tipo{" "}
                    <strong>{data.tarifaSeleccionada?.tipo_unidad}</strong>{" "}
                    disponibles.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Unidad Asignada
                      {data.tarifaSeleccionada && (
                        <Badge variant="outline" className="ml-2">
                          Requiere: {data.tarifaSeleccionada.tipo_unidad}
                        </Badge>
                      )}
                    </Label>
                    <Select
                      value={data.unidadId.toString()}
                      onValueChange={handleUnidadChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una unidad disponible..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesDisponibles.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">
                              No hay unidades disponibles del tipo requerido
                            </p>
                          </div>
                        ) : (
                          unidadesDisponibles.map((unidad) => (
                            <SelectItem
                              key={unidad.id}
                              value={unidad.id.toString()}
                            >
                              <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {unidad.numero_economico}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {unidad.marca} {unidad.modelo} (
                                    {unidad.year})
                                  </span>
                                </div>
                                <Badge className="bg-status-success text-white ml-auto">
                                  Disponible
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {data.unidadId && (
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">
                              {data.unidadNumero}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {
                                unidades.find((u) => u.id === data.unidadId)
                                  ?.marca
                              }{" "}
                              {
                                unidades.find((u) => u.id === data.unidadId)
                                  ?.modelo
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Operador Asignado
                    </Label>
                    <Select
                      value={data.operadorId.toString()}
                      onValueChange={handleOperadorChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un operador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoresDisponibles.map((operador: any) => {
                          const isExpired =
                            getExpiryStatus(operador.license_expiry) ===
                            "danger";
                          return (
                            <SelectItem
                              key={operador.id}
                              value={operador.id.toString()}
                              className={
                                isExpired ? "bg-red-50 dark:bg-red-950/20" : ""
                              }
                            >
                              <div className="flex items-center gap-3 w-full">
                                <User className="h-4 w-4" />
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">
                                    {operador.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Lic. {operador.license_type} •{" "}
                                    {operador.license_number}
                                  </span>
                                </div>
                                {getOperatorStatusBadge(operador)}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {data.operadorId && (
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <User className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg">
                              {data.operadorNombre}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {
                                operadores.find(
                                  (op: any) => op.id === data.operadorId,
                                )?.phone
                              }
                            </p>
                          </div>
                          {data.operadorId &&
                            getOperatorStatusBadge(
                              operadores.find(
                                (op: any) => op.id === data.operadorId,
                              )!,
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {data.operadorId &&
                    getExpiryStatus(
                      operadores.find((op: any) => op.id === data.operadorId)
                        ?.license_expiry || "",
                    ) === "danger" && (
                      <Alert className="border-status-danger bg-status-danger/10">
                        <ShieldAlert className="h-5 w-5 text-status-danger" />
                        <AlertTitle className="text-status-danger">
                          Licencia Vencida
                        </AlertTitle>
                        <AlertDescription>
                          Este operador tiene documentos vencidos. Continuar
                          bajo su responsabilidad.
                        </AlertDescription>
                      </Alert>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* ============= STEP 3 ============= */}
          {currentStep === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Anticipos al Operador
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Anticipo Casetas</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoCasetas}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            anticipoCasetas: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Anticipo Viáticos</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoViaticos}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            anticipoViaticos: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Anticipo Combustible</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoCombustible}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            anticipoCombustible: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Input
                    placeholder="Notas adicionales para el viaje..."
                    value={data.observaciones}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        observaciones: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">
                          {data.clienteNombre}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Destino:</span>
                        <span className="font-medium">
                          {data.subClienteNombre}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ruta:</span>
                        <span className="font-medium">
                          {data.tarifaSeleccionada?.nombre_ruta}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Unidad:</span>
                        <span className="font-medium">{data.unidadNumero}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operador:</span>
                        <span className="font-medium">
                          {data.operadorNombre}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tarifa Base:
                        </span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            data.tarifaSeleccionada?.tarifa_base || 0,
                            data.tarifaSeleccionada?.moneda,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-status-danger">
                        <span>(-) Total Anticipos:</span>
                        <span>{formatCurrency(totalAnticipos)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold">Saldo Operador:</span>
                        <span
                          className={`text-2xl font-bold ${saldoOperador >= 0 ? "text-status-success" : "text-status-danger"}`}
                        >
                          {formatCurrency(saldoOperador)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {saldoOperador < 0 && (
                  <Alert className="border-status-danger bg-status-danger/10">
                    <AlertTriangle className="h-5 w-5 text-status-danger" />
                    <AlertTitle className="text-status-danger">
                      Saldo Negativo
                    </AlertTitle>
                    <AlertDescription>
                      Los anticipos superan la tarifa base. Revisa los montos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
          <Button
            variant="outline"
            onClick={() =>
              setCurrentStep((prev) =>
                prev > 1 ? ((prev - 1) as WizardStep) : prev,
              )
            }
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          {currentStep < 3 ? (
            <Button
              onClick={() =>
                setCurrentStep((prev) =>
                  prev < 3 ? ((prev + 1) as WizardStep) : prev,
                )
              }
              disabled={!canProceed}
              className="gap-2"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmDispatch}
              className="gap-2 bg-status-success hover:bg-status-success/90"
            >
              <CheckCircle className="h-4 w-4" /> Confirmar y Generar Carta
              Porte
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
