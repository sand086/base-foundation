import { useState, useMemo } from "react";
import {
  Check,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Truck,
  User,
  FileText,
  ShieldAlert,
  Lock,
  Container,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  mockDispatchClientes,
  mockSubClientes,
  mockDispatchRoutes,
  mockDispatchUnits,
  mockDrivers,
} from "@/data/despachoData";
import { mockRemolques, mockDollies } from "@/data/remolquesData";
import { useSecurityNotifications } from "@/hooks/useSecurityNotifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3;

interface WizardData {
  clienteId: string;
  clienteNombre: string;
  subClienteId: string;
  subClienteNombre: string;
  subClienteDireccion: string;
  routeId: string;
  routeNombre: string;
  origen: string;
  destino: string;
  unitId: string;
  unitNumero: string;
  unitTipo: "5ejes" | "9ejes";
  driverId: string;
  driverNombre: string;
  precio: number;
  // Multirremolque fields
  remolque1Id: string;
  remolque1Numero: string;
  dollyId: string;
  dollyNumero: string;
  remolque2Id: string;
  remolque2Numero: string;
}

const initialData: WizardData = {
  clienteId: "",
  clienteNombre: "",
  subClienteId: "",
  subClienteNombre: "",
  subClienteDireccion: "",
  routeId: "",
  routeNombre: "",
  origen: "",
  destino: "",
  unitId: "",
  unitNumero: "",
  unitTipo: "5ejes",
  driverId: "",
  driverNombre: "",
  precio: 0,
  // Multirremolque fields
  remolque1Id: "",
  remolque1Numero: "",
  dollyId: "",
  dollyNumero: "",
  remolque2Id: "",
  remolque2Numero: "",
};

// Simulated current user role - In production this would come from auth context
const CURRENT_USER_ROLE = "SuperAdmin"; // Change to 'Operador' to test non-admin behavior
const CURRENT_USER_NAME = "Carlos Administrador";

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [unitBlocked, setUnitBlocked] = useState(false);
  const [driverBlocked, setDriverBlocked] = useState(false);
  const [blockReasons, setBlockReasons] = useState<string[]>([]);
  const [forceOverrideDialogOpen, setForceOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideApplied, setOverrideApplied] = useState(false);

  const { sendSecurityNotification } = useSecurityNotifications();

  const steps = [
    { number: 1, title: "El Servicio", description: "Client, Destino y Ruta" },
    { number: 2, title: "Los Recursos", description: "Unidad y Operador" },
    { number: 3, title: "Confirmación", description: "Resumen y Carta Porte" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // Filtered data based on selections
  const availableSubClientes = useMemo(() => {
    return mockSubClientes.filter((s) => s.clienteId === data.clienteId);
  }, [data.clienteId]);

  const availableRoutes = useMemo(() => {
    return mockDispatchRoutes.filter((r) => r.clienteId === data.clienteId);
  }, [data.clienteId]);

  // Handlers
  const handleClienteChange = (clienteId: string) => {
    const cliente = mockDispatchClientes.find((c) => c.id === clienteId);
    setData({
      ...initialData,
      clienteId,
      clienteNombre: cliente?.nombre || "",
    });
    setOverrideApplied(false);
  };

  const handleSubClienteChange = (subClienteId: string) => {
    const subCliente = mockSubClientes.find((s) => s.id === subClienteId);
    setData({
      ...data,
      subClienteId,
      subClienteNombre: subCliente?.nombre || "",
      subClienteDireccion: subCliente
        ? `${subCliente.direccion}, ${subCliente.ciudad}, ${subCliente.estado}`
        : "",
    });
  };

  const handleRouteChange = (routeId: string) => {
    const route = mockDispatchRoutes.find((r) => r.id === routeId);
    if (route) {
      setData({
        ...data,
        routeId,
        routeNombre: route.nombre,
        origen: route.origen,
        destino: route.destino,
        precio:
          data.unitTipo === "9ejes" ? route.precio9Ejes : route.precio5Ejes,
      });
    }
  };

  const handleUnitChange = (unitId: string) => {
    const unit = mockDispatchUnits.find((u) => u.id === unitId);
    if (unit) {
      const route = mockDispatchRoutes.find((r) => r.id === data.routeId);
      const newPrecio = route
        ? unit.tipo === "9ejes"
          ? route.precio9Ejes
          : route.precio5Ejes
        : data.precio;

      setData({
        ...data,
        unitId,
        unitNumero: unit.numero,
        unitTipo: unit.tipo,
        precio: newPrecio,
        // Reset trailer selections when unit type changes
        remolque1Id: "",
        remolque1Numero: "",
        dollyId: "",
        dollyNumero: "",
        remolque2Id: "",
        remolque2Numero: "",
      });

      // Reset override when changing selection
      setOverrideApplied(false);

      // Check for blocked status based on document expiration
      const reasons: string[] = [];
      if (unit.documentStatus === "vencido") {
        reasons.push(
          `Unidad: ${unit.documentoVencido || "Documentación"} vencida`,
        );
      }

      setUnitBlocked(unit.documentStatus === "vencido");

      // Update combined block reasons
      const driverReasons = blockReasons.filter((r) =>
        r.startsWith("Operador:"),
      );
      setBlockReasons([...reasons, ...driverReasons]);
    }
  };

  // Handlers for trailers
  const handleRemolque1Change = (remolqueId: string) => {
    const remolque = mockRemolques.find((r) => r.id === remolqueId);
    if (remolque) {
      setData({
        ...data,
        remolque1Id: remolqueId,
        remolque1Numero: remolque.numero,
      });
    }
  };

  const handleDollyChange = (dollyId: string) => {
    const dolly = mockDollies.find((d) => d.id === dollyId);
    if (dolly) {
      setData({
        ...data,
        dollyId,
        dollyNumero: dolly.numero,
      });
    }
  };

  const handleRemolque2Change = (remolqueId: string) => {
    const remolque = mockRemolques.find((r) => r.id === remolqueId);
    if (remolque) {
      setData({
        ...data,
        remolque2Id: remolqueId,
        remolque2Numero: remolque.numero,
      });
    }
  };

  // Available trailers (not already selected)
  const availableRemolquesForSlot1 = useMemo(() => {
    return mockRemolques.filter(
      (r) => r.status === "disponible" && r.id !== data.remolque2Id,
    );
  }, [data.remolque2Id]);

  const availableRemolquesForSlot2 = useMemo(() => {
    return mockRemolques.filter(
      (r) => r.status === "disponible" && r.id !== data.remolque1Id,
    );
  }, [data.remolque1Id]);

  const availableDollies = useMemo(() => {
    return mockDollies.filter((d) => d.status === "disponible");
  }, []);

  const handleDriverChange = (driverId: string) => {
    const driver = mockDrivers.find((d) => d.id === driverId);
    if (driver) {
      setData({
        ...data,
        driverId,
        driverNombre: driver.nombre,
      });

      // Reset override when changing selection
      setOverrideApplied(false);

      // Check for blocked status based on license expiration
      const reasons: string[] = [];
      if (driver.licenciaStatus === "vencido") {
        reasons.push(`Operador: Licencia vencida`);
      }

      setDriverBlocked(driver.licenciaStatus === "vencido");

      // Update combined block reasons
      const unitReasons = blockReasons.filter((r) => r.startsWith("Unidad:"));
      setBlockReasons([...unitReasons, ...reasons]);
    }
  };

  const handleForceOverride = () => {
    if (!overrideReason.trim()) {
      toast.error("Debes proporcionar un motivo para el desbloqueo");
      return;
    }

    // Log the override action
    sendSecurityNotification({
      event: "forced_assignment",
      details: {
        adminName: CURRENT_USER_NAME,
        reason: overrideReason,
        tripId: `${data.clienteNombre} - ${data.routeNombre}`,
      },
    });

    setOverrideApplied(true);
    setForceOverrideDialogOpen(false);
    setOverrideReason("");

    toast.success("Bloqueo anulado", {
      description: "Se registró la acción en el log de auditoría.",
    });
  };

  // Check if there are any blocking issues
  const hasBlockingIssues = unitBlocked || driverBlocked;

  // Validate trailer requirements based on unit type
  const isTrailerRequirementMet = useMemo(() => {
    if (!data.unitId) return false;

    if (data.unitTipo === "9ejes") {
      // Full requires: Remolque 1 + Dolly + Remolque 2
      return !!data.remolque1Id && !!data.dollyId && !!data.remolque2Id;
    } else {
      // Sencillo requires: Remolque 1 only
      return !!data.remolque1Id;
    }
  }, [
    data.unitId,
    data.unitTipo,
    data.remolque1Id,
    data.dollyId,
    data.remolque2Id,
  ]);

  const canProceedStep2 =
    data.unitId &&
    data.driverId &&
    isTrailerRequirementMet &&
    (!hasBlockingIssues || overrideApplied);

  // Step validation
  const isStep1Valid = data.clienteId && data.subClienteId && data.routeId;

  const canProceed = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return canProceedStep2;
    return true;
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case "vigente":
        return <StatusBadge status="success">Vigente</StatusBadge>;
      case "por_vencer":
        return <StatusBadge status="warning">Por Vencer</StatusBadge>;
      case "vencido":
        return <StatusBadge status="danger">Vencido</StatusBadge>;
      default:
        return null;
    }
  };

  const isSuperAdmin = CURRENT_USER_ROLE === "SuperAdmin";

  return (
    <div className="space-y-6">
      {/* Steps Indicator */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                  currentStep > step.number
                    ? "bg-emerald-600 text-white"
                    : currentStep === step.number
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500",
                )}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep >= step.number
                      ? "text-slate-800"
                      : "text-slate-400",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight
                className={cn(
                  "h-5 w-5 mx-4 mt-[-20px]",
                  currentStep > step.number
                    ? "text-emerald-600"
                    : "text-slate-300",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: The Job */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg mb-4">
                <MapPin className="h-5 w-5" />
                <span>Paso 1: Datos del Servicio</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client */}
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={data.clienteId}
                    onValueChange={handleClienteChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDispatchClientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-Client */}
                <div className="space-y-2">
                  <Label>Destino (Sub-Client)</Label>
                  <Select
                    value={data.subClienteId}
                    onValueChange={handleSubClienteChange}
                    disabled={!data.clienteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar destino..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubClientes.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          <div>
                            <span className="font-medium">{sub.nombre}</span>
                            <span className="text-slate-500 ml-2 text-sm">
                              - {sub.ciudad}, {sub.estado}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ruta */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Ruta</Label>
                  <Select
                    value={data.routeId}
                    onValueChange={handleRouteChange}
                    disabled={!data.clienteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ruta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{route.nombre}</span>
                            <span className="text-emerald-600 font-mono ml-4">
                              {formatCurrency(route.precio5Ejes)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Display */}
              {data.routeId && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-emerald-800">
                        Precio de Ruta (Base 5 Ejes)
                      </p>
                      <p className="text-xs text-emerald-600">
                        Incluye{" "}
                        {mockDispatchRoutes.find((r) => r.id === data.routeId)
                          ?.casetasIncluidas || 0}{" "}
                        casetas
                      </p>
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-700">
                      {formatCurrency(data.precio)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Resources */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg mb-4">
                <Truck className="h-5 w-5" />
                <span>Paso 2: Asignación de Recursos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Selection */}
                <div className="space-y-2">
                  <Label>Unidad (Tractocamión)</Label>
                  <Select value={data.unitId} onValueChange={handleUnitChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDispatchUnits.map((unit) => (
                        <SelectItem
                          key={unit.id}
                          value={unit.id}
                          className={cn(
                            unit.documentStatus === "vencido" && "opacity-60",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{unit.numero}</span>
                            <span className="text-slate-500 text-sm">
                              {unit.marca} {unit.modelo}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({unit.tipo === "9ejes" ? "9 Ejes" : "5 Ejes"})
                            </span>
                            {getDocStatusBadge(unit.documentStatus)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Unit Status Display */}
                  {data.unitId && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-slate-600">
                        Estado Documentos:
                      </span>
                      {getDocStatusBadge(
                        mockDispatchUnits.find((u) => u.id === data.unitId)
                          ?.documentStatus || "",
                      )}
                    </div>
                  )}
                </div>

                {/* Driver Selection */}
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select
                    value={data.driverId}
                    onValueChange={handleDriverChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar operador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDrivers.map((driver) => (
                        <SelectItem
                          key={driver.id}
                          value={driver.id}
                          className={cn(
                            driver.licenciaStatus === "vencido" && "opacity-60",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{driver.nombre}</span>
                            {getDocStatusBadge(driver.licenciaStatus)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Driver Status Display */}
                  {data.driverId && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-slate-600">Licencia:</span>
                      {getDocStatusBadge(
                        mockDrivers.find((d) => d.id === data.driverId)
                          ?.licenciaStatus || "",
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Trailer/Remolque Selection - Conditional based on unit type */}
              {data.unitId && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Container className="h-4 w-4" />
                    <span>
                      Configuración de Remolques
                      {data.unitTipo === "9ejes"
                        ? " (Full - 9 Ejes)"
                        : " (Sencillo - 5 Ejes)"}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "grid gap-4",
                      data.unitTipo === "9ejes"
                        ? "grid-cols-1 md:grid-cols-3"
                        : "grid-cols-1 md:grid-cols-2",
                    )}
                  >
                    {/* Remolque 1 - Always required */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        {data.unitTipo === "9ejes"
                          ? "Remolque 1 *"
                          : "Remolque *"}
                      </Label>
                      <Select
                        value={data.remolque1Id}
                        onValueChange={handleRemolque1Change}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar remolque..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRemolquesForSlot1.map((rem) => (
                            <SelectItem key={rem.id} value={rem.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {rem.numero}
                                </span>
                                <span className="text-slate-500 text-sm">
                                  {rem.descripcion}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dolly - Only for 9 ejes (Full) */}
                    {data.unitTipo === "9ejes" && (
                      <div className="space-y-2">
                        <Label>Dolly *</Label>
                        <Select
                          value={data.dollyId}
                          onValueChange={handleDollyChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar dolly..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDollies.map((dolly) => (
                              <SelectItem key={dolly.id} value={dolly.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {dolly.numero}
                                  </span>
                                  <span className="text-slate-500 text-sm capitalize">
                                    {dolly.tipo.replace("_", " ")}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Remolque 2 - Only for 9 ejes (Full) */}
                    {data.unitTipo === "9ejes" && (
                      <div className="space-y-2">
                        <Label>Remolque 2 *</Label>
                        <Select
                          value={data.remolque2Id}
                          onValueChange={handleRemolque2Change}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar remolque..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRemolquesForSlot2.map((rem) => (
                              <SelectItem key={rem.id} value={rem.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {rem.numero}
                                  </span>
                                  <span className="text-slate-500 text-sm">
                                    {rem.descripcion}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Visual indicator of what's required */}
                  {!isTrailerRequirementMet && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {data.unitTipo === "9ejes"
                        ? "Debe seleccionar Remolque 1, Dolly y Remolque 2 para unidad Full"
                        : "Debe seleccionar un Remolque para continuar"}
                    </p>
                  )}
                </div>
              )}

              {/* Blocking Warning - Documents Expired */}
              {hasBlockingIssues && !overrideApplied && (
                <Alert className="bg-red-50 border-red-300 border-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  <AlertTitle className="text-red-800 font-bold">
                    ⛔ Asignación Bloqueada por Documentación Vencida
                  </AlertTitle>
                  <AlertDescription className="text-red-700 mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      {blockReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm">
                      No es posible continuar hasta regularizar la
                      documentación.
                    </p>

                    {/* SuperAdmin Override Button */}
                    {isSuperAdmin && (
                      <div className="mt-4 pt-3 border-t border-red-200">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => setForceOverrideDialogOpen(true)}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Forzar Asignación (Admin Override)
                        </Button>
                        <p className="text-xs mt-2 text-red-600">
                          Solo visible para SuperAdmin. Esta acción quedará
                          registrada.
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Override Applied Indicator */}
              {overrideApplied && hasBlockingIssues && (
                <Alert className="bg-amber-50 border-amber-300">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    ⚡ Bloqueo Anulado por Administrador
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {CURRENT_USER_NAME} autorizó continuar a pesar de la
                    documentación vencida. Esta acción fue registrada en el log
                    de auditoría.
                  </AlertDescription>
                </Alert>
              )}

              {/* Updated Price based on unit type */}
              {data.unitId && data.unitTipo === "9ejes" && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-amber-800">
                        Precio Ajustado (9 Ejes - Full)
                      </p>
                      <p className="text-xs text-amber-600">
                        El precio se actualizó por seleccionar unidad de 9 ejes
                      </p>
                    </div>
                    <p className="text-2xl font-bold font-mono text-amber-700">
                      {formatCurrency(data.precio)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg mb-4">
                <FileText className="h-5 w-5" />
                <span>Paso 3: Confirmación del Servicio</span>
              </div>

              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Viaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Client
                        </p>
                        <p className="font-semibold text-slate-800">
                          {data.clienteNombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Destino
                        </p>
                        <p className="font-medium text-slate-700">
                          {data.subClienteNombre}
                        </p>
                        <p className="text-sm text-slate-500">
                          {data.subClienteDireccion}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Ruta
                        </p>
                        <p className="font-medium text-slate-700">
                          {data.routeNombre}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Origen
                        </p>
                        <p className="font-medium text-slate-700">
                          {data.origen}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Unidad
                        </p>
                        <p className="font-semibold text-slate-800">
                          {data.unitNumero}
                        </p>
                        <p className="text-sm text-slate-500">
                          {
                            mockDispatchUnits.find((u) => u.id === data.unitId)
                              ?.marca
                          }{" "}
                          {
                            mockDispatchUnits.find((u) => u.id === data.unitId)
                              ?.modelo
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Operador
                        </p>
                        <p className="font-medium text-slate-700">
                          {data.driverNombre}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Override Warning in Summary */}
                  {overrideApplied && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-sm">
                        Este viaje fue autorizado con override administrativo
                        por {CURRENT_USER_NAME}.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center p-4 bg-emerald-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-emerald-800">
                          Precio Total del Servicio
                        </p>
                        <p className="text-xs text-emerald-600">
                          Tipo:{" "}
                          {data.unitTipo === "9ejes"
                            ? "9 Ejes (Full)"
                            : "5 Ejes (Sencillo)"}
                        </p>
                      </div>
                      <p className="text-3xl font-bold font-mono text-emerald-700">
                        {formatCurrency(data.precio)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
              disabled={currentStep === 1}
            >
              Anterior
            </Button>

            {currentStep < 3 ? (
              <ActionButton
                onClick={() =>
                  setCurrentStep((prev) => (prev + 1) as WizardStep)
                }
                disabled={!canProceed()}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </ActionButton>
            ) : (
              <ActionButton
                onClick={() => {
                  console.log("Generating Carta Porte with data:", data);
                  toast.success("¡Carta Porte generada exitosamente!");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Confirmar y Generar Carta Porte
              </ActionButton>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Force Override Dialog */}
      <Dialog
        open={forceOverrideDialogOpen}
        onOpenChange={setForceOverrideDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Forzar Asignación - Admin Override
            </DialogTitle>
            <DialogDescription>
              Esta acción permitirá continuar a pesar de la documentación
              vencida. Se registrará en el log de auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">
                Documentos bloqueantes:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                {blockReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="override-reason">Motivo del Desbloqueo *</Label>
              <Textarea
                id="override-reason"
                placeholder="Ej: Client confirmó urgencia, documentos en trámite de renovación..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceOverrideDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceOverride}
              disabled={!overrideReason.trim()}
            >
              Confirmar Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
