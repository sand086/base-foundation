import { useState, useMemo } from "react";
import { Check, ChevronRight, AlertTriangle, MapPin, Truck, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mockDispatchClientes,
  mockSubClientes,
  mockDispatchRoutes,
  mockDispatchUnits,
  mockDrivers,
} from "@/data/despachoData";
import { cn } from "@/lib/utils";

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
  unitTipo: '5ejes' | '9ejes';
  driverId: string;
  driverNombre: string;
  precio: number;
}

const initialData: WizardData = {
  clienteId: '',
  clienteNombre: '',
  subClienteId: '',
  subClienteNombre: '',
  subClienteDireccion: '',
  routeId: '',
  routeNombre: '',
  origen: '',
  destino: '',
  unitId: '',
  unitNumero: '',
  unitTipo: '5ejes',
  driverId: '',
  driverNombre: '',
  precio: 0,
};

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [unitBlocked, setUnitBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const steps = [
    { number: 1, title: 'El Servicio', description: 'Cliente, Destino y Ruta' },
    { number: 2, title: 'Los Recursos', description: 'Unidad y Operador' },
    { number: 3, title: 'Confirmación', description: 'Resumen y Carta Porte' },
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
      clienteNombre: cliente?.nombre || '',
    });
  };

  const handleSubClienteChange = (subClienteId: string) => {
    const subCliente = mockSubClientes.find((s) => s.id === subClienteId);
    setData({
      ...data,
      subClienteId,
      subClienteNombre: subCliente?.nombre || '',
      subClienteDireccion: subCliente ? `${subCliente.direccion}, ${subCliente.ciudad}, ${subCliente.estado}` : '',
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
        precio: data.unitTipo === '9ejes' ? route.precio9Ejes : route.precio5Ejes,
      });
    }
  };

  const handleUnitChange = (unitId: string) => {
    const unit = mockDispatchUnits.find((u) => u.id === unitId);
    if (unit) {
      const route = mockDispatchRoutes.find((r) => r.id === data.routeId);
      const newPrecio = route 
        ? (unit.tipo === '9ejes' ? route.precio9Ejes : route.precio5Ejes)
        : data.precio;

      setData({
        ...data,
        unitId,
        unitNumero: unit.numero,
        unitTipo: unit.tipo,
        precio: newPrecio,
      });

      // Check for blocked status
      if (unit.documentStatus === 'vencido') {
        setUnitBlocked(true);
        setBlockReason(unit.documentoVencido || 'Documentación');
      } else {
        setUnitBlocked(false);
        setBlockReason('');
      }
    }
  };

  const handleDriverChange = (driverId: string) => {
    const driver = mockDrivers.find((d) => d.id === driverId);
    setData({
      ...data,
      driverId,
      driverNombre: driver?.nombre || '',
    });
  };

  // Step validation
  const isStep1Valid = data.clienteId && data.subClienteId && data.routeId;
  const isStep2Valid = data.unitId && data.driverId && !unitBlocked;

  const canProceed = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    return true;
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'vigente':
        return <StatusBadge status="success">Vigente</StatusBadge>;
      case 'por_vencer':
        return <StatusBadge status="warning">Por Vencer</StatusBadge>;
      case 'vencido':
        return <StatusBadge status="danger">Vencido</StatusBadge>;
      default:
        return null;
    }
  };

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
                    : "bg-slate-200 text-slate-500"
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
                      : "text-slate-400"
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
                    : "text-slate-300"
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
                {/* Cliente */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={data.clienteId} onValueChange={handleClienteChange}>
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

                {/* Sub-Cliente */}
                <div className="space-y-2">
                  <Label>Destino (Sub-Cliente)</Label>
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
                      <p className="text-sm text-emerald-800">Precio de Ruta (Base 5 Ejes)</p>
                      <p className="text-xs text-emerald-600">
                        Incluye {mockDispatchRoutes.find(r => r.id === data.routeId)?.casetasIncluidas || 0} casetas
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
                            unit.documentStatus === 'vencido' && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{unit.numero}</span>
                            <span className="text-slate-500 text-sm">
                              {unit.marca} {unit.modelo}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({unit.tipo === '9ejes' ? '9 Ejes' : '5 Ejes'})
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
                      <span className="text-sm text-slate-600">Estado Documentos:</span>
                      {getDocStatusBadge(
                        mockDispatchUnits.find((u) => u.id === data.unitId)?.documentStatus || ''
                      )}
                    </div>
                  )}
                </div>

                {/* Driver Selection */}
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select value={data.driverId} onValueChange={handleDriverChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar operador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
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
                        mockDrivers.find((d) => d.id === data.driverId)?.licenciaStatus || ''
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Blocked Unit Warning */}
              {unitBlocked && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>⛔ Unidad Bloqueada por Documentación</strong>
                    <br />
                    El documento "{blockReason}" de la unidad {data.unitNumero} está vencido.
                    No es posible asignar esta unidad hasta regularizar su documentación.
                  </AlertDescription>
                </Alert>
              )}

              {/* Updated Price based on unit type */}
              {data.unitId && data.unitTipo === '9ejes' && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-amber-800">Precio Ajustado (9 Ejes - Full)</p>
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
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente</p>
                        <p className="font-semibold text-slate-800">{data.clienteNombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Destino</p>
                        <p className="font-medium text-slate-700">{data.subClienteNombre}</p>
                        <p className="text-sm text-slate-500">{data.subClienteDireccion}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Ruta</p>
                        <p className="font-medium text-slate-700">{data.routeNombre}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Origen</p>
                        <p className="font-medium text-slate-700">{data.origen}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Unidad</p>
                        <p className="font-semibold text-slate-800">{data.unitNumero}</p>
                        <p className="text-sm text-slate-500">
                          {mockDispatchUnits.find(u => u.id === data.unitId)?.marca}{' '}
                          {mockDispatchUnits.find(u => u.id === data.unitId)?.modelo}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Operador</p>
                        <p className="font-medium text-slate-700">{data.driverNombre}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center p-4 bg-emerald-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Precio Total del Servicio</p>
                        <p className="text-xs text-emerald-600">
                          Tipo: {data.unitTipo === '9ejes' ? '9 Ejes (Full)' : '5 Ejes (Sencillo)'}
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
                onClick={() => setCurrentStep((prev) => (prev + 1) as WizardStep)}
                disabled={!canProceed()}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </ActionButton>
            ) : (
              <ActionButton
                onClick={() => {
                  console.log('Generating Carta Porte with data:', data);
                  alert('¡Carta Porte generada exitosamente!');
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Confirmar y Generar Carta Porte
              </ActionButton>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
