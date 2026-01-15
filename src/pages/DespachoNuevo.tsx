import { useState, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// Importing from centralized data sources
import { mockClients, TarifaAutorizada, SubClienteDetalle } from '@/data/mockData';
import { mockOperadores, getExpiryStatus, getExpiryLabel } from '@/data/flotaData';
import { mockFleetUnits, getAvailableUnitsByType, getUnitTypeLabel, getUnitTypeEmoji } from '@/data/flotaUnidadesData';

type WizardStep = 1 | 2 | 3;

interface DispatchData {
  // Step 1 - Route Selection
  clienteId: string;
  clienteNombre: string;
  subClienteId: string;
  subClienteNombre: string;
  tarifaId: string;
  tarifaSeleccionada: TarifaAutorizada | null;
  
  // Step 2 - Resource Assignment
  unidadId: string;
  unidadNumero: string;
  operadorId: string;
  operadorNombre: string;
  
  // Step 3 - Financial
  anticipoCasetas: number;
  anticipoViaticos: number;
  anticipoCombustible: number;
  observaciones: string;
}

const initialData: DispatchData = {
  clienteId: '',
  clienteNombre: '',
  subClienteId: '',
  subClienteNombre: '',
  tarifaId: '',
  tarifaSeleccionada: null,
  unidadId: '',
  unidadNumero: '',
  operadorId: '',
  operadorNombre: '',
  anticipoCasetas: 0,
  anticipoViaticos: 0,
  anticipoCombustible: 0,
  observaciones: '',
};

// Helper to format currency
const formatCurrency = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function DespachoNuevo() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [data, setData] = useState<DispatchData>(initialData);

  // ============= STEP 1: Derived Data from Clients =============
  
  // Get selected client's subclientes
  const subClientesDisponibles = useMemo(() => {
    if (!data.clienteId) return [];
    const cliente = mockClients.find(c => c.id === data.clienteId);
    return cliente?.subClientesDetalle?.filter(sc => sc.estatus === 'activo') || [];
  }, [data.clienteId]);

  // Get selected subcliente's tarifas
  const tarifasDisponibles = useMemo(() => {
    if (!data.subClienteId) return [];
    const subCliente = subClientesDisponibles.find(sc => sc.id === data.subClienteId);
    return subCliente?.tarifas?.filter(t => t.estatus === 'activa') || [];
  }, [data.subClienteId, subClientesDisponibles]);

  // Get current subcliente for commercial conditions display
  const subClienteActual = useMemo(() => {
    return subClientesDisponibles.find(sc => sc.id === data.subClienteId);
  }, [data.subClienteId, subClientesDisponibles]);

  // ============= STEP 2: Derived Data from Fleet =============
  
  // Get available units based on required type
  const unidadesDisponibles = useMemo(() => {
    if (!data.tarifaSeleccionada) return [];
    return getAvailableUnitsByType(data.tarifaSeleccionada.tipoUnidad);
  }, [data.tarifaSeleccionada]);

  // Check if there are no available units
  const noUnitsAvailable = useMemo(() => {
    return data.tarifaSeleccionada && unidadesDisponibles.length === 0;
  }, [data.tarifaSeleccionada, unidadesDisponibles]);

  // Get available operators (active only)
  const operadoresDisponibles = useMemo(() => {
    return mockOperadores.filter(op => 
      op.status === 'activo' && !op.assigned_unit
    );
  }, []);

  // ============= STEP 3: Financial Calculations =============
  
  const totalAnticipos = useMemo(() => {
    return data.anticipoCasetas + data.anticipoViaticos + data.anticipoCombustible;
  }, [data.anticipoCasetas, data.anticipoViaticos, data.anticipoCombustible]);

  const saldoOperador = useMemo(() => {
    if (!data.tarifaSeleccionada) return 0;
    return data.tarifaSeleccionada.tarifaBase - totalAnticipos;
  }, [data.tarifaSeleccionada, totalAnticipos]);

  // ============= HANDLERS =============
  
  const handleClienteChange = (clienteId: string) => {
    const cliente = mockClients.find(c => c.id === clienteId);
    setData(prev => ({
      ...prev,
      clienteId,
      clienteNombre: cliente?.razónSocial || '',
      subClienteId: '',
      subClienteNombre: '',
      tarifaId: '',
      tarifaSeleccionada: null,
      unidadId: '',
      unidadNumero: '',
    }));
  };

  const handleSubClienteChange = (subClienteId: string) => {
    const subCliente = subClientesDisponibles.find(sc => sc.id === subClienteId);
    setData(prev => ({
      ...prev,
      subClienteId,
      subClienteNombre: subCliente?.nombre || '',
      tarifaId: '',
      tarifaSeleccionada: null,
      unidadId: '',
      unidadNumero: '',
    }));
  };

  const handleTarifaChange = (tarifaId: string) => {
    const tarifa = tarifasDisponibles.find(t => t.id === tarifaId);
    setData(prev => ({
      ...prev,
      tarifaId,
      tarifaSeleccionada: tarifa || null,
      unidadId: '',
      unidadNumero: '',
      anticipoCasetas: tarifa?.costoCasetas || 0,
    }));
  };

  const handleUnidadChange = (unidadId: string) => {
    const unidad = mockFleetUnits.find(u => u.id === unidadId);
    setData(prev => ({
      ...prev,
      unidadId,
      unidadNumero: unidad?.numeroEconomico || '',
    }));
  };

  const handleOperadorChange = (operadorId: string) => {
    const operador = mockOperadores.find(op => op.id === operadorId);
    setData(prev => ({
      ...prev,
      operadorId,
      operadorNombre: operador?.name || '',
    }));
  };

  const handleConfirmDispatch = () => {
    console.log('Dispatch Data:', data);
    toast({
      title: '✅ Viaje Despachado',
      description: `Carta Porte generada para ${data.unidadNumero} - Ruta: ${data.tarifaSeleccionada?.nombreRuta}`,
    });
    // Reset form
    setData(initialData);
    setCurrentStep(1);
  };

  // ============= VALIDATION =============
  
  const isStep1Valid = data.clienteId && data.subClienteId && data.tarifaId;
  const isStep2Valid = data.unidadId && data.operadorId;
  const canProceed = currentStep === 1 ? isStep1Valid : currentStep === 2 ? isStep2Valid : true;

  // ============= STEP NAVIGATION =============
  
  const steps = [
    { step: 1, label: 'Ruta y Tarifa', icon: Route },
    { step: 2, label: 'Recursos', icon: Truck },
    { step: 3, label: 'Financiero', icon: Wallet },
  ];

  // Helper for operator license status badge
  const getOperatorStatusBadge = (operador: typeof mockOperadores[0]) => {
    const licenseStatus = getExpiryStatus(operador.license_expiry);
    const medicalStatus = getExpiryStatus(operador.medical_check_expiry);
    
    if (licenseStatus === 'danger' || medicalStatus === 'danger') {
      return (
        <Badge className="bg-status-danger text-white text-xs">
          {getExpiryLabel(licenseStatus === 'danger' ? operador.license_expiry : operador.medical_check_expiry)}
        </Badge>
      );
    }
    if (licenseStatus === 'warning' || medicalStatus === 'warning') {
      return (
        <Badge className="bg-status-warning text-black text-xs">
          {getExpiryLabel(licenseStatus === 'warning' ? operador.license_expiry : operador.medical_check_expiry)}
        </Badge>
      );
    }
    return <Badge className="bg-status-success text-white text-xs">Vigente</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        {steps.map((s, index) => (
          <div key={s.step} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                currentStep === s.step
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : currentStep > s.step
                  ? 'bg-status-success/20 text-status-success'
                  : 'bg-muted text-muted-foreground'
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

      {/* Main Content Card */}
      <Card className="border-2">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <><Route className="h-5 w-5" /> Paso 1: Selección de Ruta y Tarifa</>}
            {currentStep === 2 && <><Truck className="h-5 w-5" /> Paso 2: Asignación de Recursos</>}
            {currentStep === 3 && <><Wallet className="h-5 w-5" /> Paso 3: Resumen Financiero</>}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Selecciona el cliente, destino y la tarifa autorizada para este viaje'}
            {currentStep === 2 && 'Asigna la unidad y el operador disponibles'}
            {currentStep === 3 && 'Configura los anticipos y revisa el resumen del viaje'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* ============= STEP 1: ROUTE SELECTION ============= */}
          {currentStep === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column - Selectors */}
              <div className="space-y-4">
                {/* Cliente Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Cliente
                  </Label>
                  <Select value={data.clienteId} onValueChange={handleClienteChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClients
                        .filter(c => c.estatus === 'activo')
                        .map(cliente => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            <div className="flex flex-col">
                              <span>{cliente.razónSocial}</span>
                              <span className="text-xs text-muted-foreground">{cliente.rfc}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destino (SubCliente) Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Destino (SubCliente)
                  </Label>
                  <Select 
                    value={data.subClienteId} 
                    onValueChange={handleSubClienteChange}
                    disabled={!data.clienteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={data.clienteId ? "Selecciona destino..." : "Primero selecciona cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subClientesDisponibles.map(sc => (
                        <SelectItem key={sc.id} value={sc.id}>
                          <div className="flex flex-col">
                            <span>{sc.nombre}</span>
                            <span className="text-xs text-muted-foreground">{sc.ciudad}, {sc.estado}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tarifa/Ruta Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Route className="h-4 w-4" /> Ruta y Tarifa Autorizada
                  </Label>
                  <Select 
                    value={data.tarifaId} 
                    onValueChange={handleTarifaChange}
                    disabled={!data.subClienteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={data.subClienteId ? "Selecciona ruta/tarifa..." : "Primero selecciona destino"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tarifasDisponibles.length === 0 && data.subClienteId ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-status-warning" />
                          <p className="text-sm">No hay tarifas configuradas para este destino</p>
                        </div>
                      ) : (
                        tarifasDisponibles.map(tarifa => (
                          <SelectItem key={tarifa.id} value={tarifa.id}>
                            <div className="flex items-center gap-3">
                              <span>{getUnitTypeEmoji(tarifa.tipoUnidad)}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{tarifa.nombreRuta}</span>
                                <span className="text-xs text-muted-foreground">
                                  {getUnitTypeLabel(tarifa.tipoUnidad)} • {formatCurrency(tarifa.tarifaBase, tarifa.moneda)}
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

              {/* Right Column - Summary */}
              <div className="space-y-4">
                {/* Selected Tariff Card */}
                {data.tarifaSeleccionada && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Tarifa Seleccionada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ruta:</span>
                        <span className="font-medium">{data.tarifaSeleccionada.nombreRuta}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tipo Unidad Requerido:</span>
                        <Badge variant="outline" className="gap-1">
                          {getUnitTypeEmoji(data.tarifaSeleccionada.tipoUnidad)}
                          {data.tarifaSeleccionada.tipoUnidad.charAt(0).toUpperCase() + data.tarifaSeleccionada.tipoUnidad.slice(1)}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tarifa Base:</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(data.tarifaSeleccionada.tarifaBase, data.tarifaSeleccionada.moneda)}
                        </span>
                      </div>
                      {data.tarifaSeleccionada.costoCasetas && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Casetas (Est.):</span>
                          <span>{formatCurrency(data.tarifaSeleccionada.costoCasetas, data.tarifaSeleccionada.moneda)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Commercial Conditions */}
                {subClienteActual && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" /> Condiciones Comerciales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Días de Crédito:</span>
                        <Badge variant="secondary">{subClienteActual.diasCredito || 0} días</Badge>
                      </div>
                      {subClienteActual.convenioEspecial && (
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

          {/* ============= STEP 2: RESOURCE ASSIGNMENT ============= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* No Units Alert */}
              {noUnitsAvailable && (
                <Alert className="border-status-warning bg-status-warning/10">
                  <AlertTriangle className="h-5 w-5 text-status-warning" />
                  <AlertTitle className="text-status-warning">Sin Unidades Disponibles</AlertTitle>
                  <AlertDescription>
                    No hay unidades tipo <strong>{data.tarifaSeleccionada?.tipoUnidad}</strong> disponibles. 
                    Considera usar una unidad de otra base o contactar al área de Mantenimiento.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Unit Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Unidad Asignada
                      {data.tarifaSeleccionada && (
                        <Badge variant="outline" className="ml-2">
                          Requiere: {data.tarifaSeleccionada.tipoUnidad}
                        </Badge>
                      )}
                    </Label>
                    <Select value={data.unidadId} onValueChange={handleUnidadChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una unidad disponible..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesDisponibles.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">No hay unidades disponibles del tipo requerido</p>
                          </div>
                        ) : (
                          unidadesDisponibles.map(unidad => (
                            <SelectItem key={unidad.id} value={unidad.id}>
                              <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{unidad.numeroEconomico}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {unidad.marca} {unidad.modelo} ({unidad.year})
                                  </span>
                                </div>
                                <Badge className="bg-status-success text-white ml-auto">Disponible</Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Unit Card */}
                  {data.unidadId && (
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{data.unidadNumero}</p>
                            <p className="text-sm text-muted-foreground">
                              {mockFleetUnits.find(u => u.id === data.unidadId)?.marca}{' '}
                              {mockFleetUnits.find(u => u.id === data.unidadId)?.modelo}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Operator Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Operador Asignado
                    </Label>
                    <Select value={data.operadorId} onValueChange={handleOperadorChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un operador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoresDisponibles.map(operador => {
                          const licenseStatus = getExpiryStatus(operador.license_expiry);
                          const isExpired = licenseStatus === 'danger';
                          
                          return (
                            <SelectItem 
                              key={operador.id} 
                              value={operador.id}
                              className={isExpired ? 'bg-red-50 dark:bg-red-950/20' : ''}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <User className="h-4 w-4" />
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">{operador.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Lic. {operador.license_type} • {operador.license_number}
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

                  {/* Selected Operator Card */}
                  {data.operadorId && (
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <User className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg">{data.operadorNombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {mockOperadores.find(op => op.id === data.operadorId)?.phone}
                            </p>
                          </div>
                          {data.operadorId && getOperatorStatusBadge(
                            mockOperadores.find(op => op.id === data.operadorId)!
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Warning for expired license */}
                  {data.operadorId && getExpiryStatus(
                    mockOperadores.find(op => op.id === data.operadorId)?.license_expiry || ''
                  ) === 'danger' && (
                    <Alert className="border-status-danger bg-status-danger/10">
                      <ShieldAlert className="h-5 w-5 text-status-danger" />
                      <AlertTitle className="text-status-danger">Licencia Vencida</AlertTitle>
                      <AlertDescription>
                        Este operador tiene documentos vencidos. Continuar bajo su responsabilidad.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============= STEP 3: FINANCIAL SUMMARY ============= */}
          {currentStep === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Anticipos */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Anticipos al Operador
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Anticipo Casetas</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoCasetas}
                        onChange={(e) => setData(prev => ({ ...prev, anticipoCasetas: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Anticipo Viáticos</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoViaticos}
                        onChange={(e) => setData(prev => ({ ...prev, anticipoViaticos: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Anticipo Combustible</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        className="pl-8"
                        value={data.anticipoCombustible}
                        onChange={(e) => setData(prev => ({ ...prev, anticipoCombustible: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Input
                    placeholder="Notas adicionales para el viaje..."
                    value={data.observaciones}
                    onChange={(e) => setData(prev => ({ ...prev, observaciones: e.target.value }))}
                  />
                </div>
              </div>

              {/* Financial Summary Card */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Route Info */}
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{data.clienteNombre}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Destino:</span>
                        <span className="font-medium">{data.subClienteNombre}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ruta:</span>
                        <span className="font-medium">{data.tarifaSeleccionada?.nombreRuta}</span>
                      </div>
                    </div>

                    {/* Resources */}
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Unidad:</span>
                        <span className="font-medium">{data.unidadNumero}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operador:</span>
                        <span className="font-medium">{data.operadorNombre}</span>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarifa Base:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(data.tarifaSeleccionada?.tarifaBase || 0, data.tarifaSeleccionada?.moneda)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-status-danger">
                        <span>(-) Total Anticipos:</span>
                        <span>{formatCurrency(totalAnticipos)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold">Saldo Operador:</span>
                        <span className={`text-2xl font-bold ${saldoOperador >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                          {formatCurrency(saldoOperador)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {saldoOperador < 0 && (
                  <Alert className="border-status-danger bg-status-danger/10">
                    <AlertTriangle className="h-5 w-5 text-status-danger" />
                    <AlertTitle className="text-status-danger">Saldo Negativo</AlertTitle>
                    <AlertDescription>
                      Los anticipos superan la tarifa base. Revisa los montos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => (prev > 1 ? (prev - 1) as WizardStep : prev))}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(prev => (prev < 3 ? (prev + 1) as WizardStep : prev))}
              disabled={!canProceed}
              className="gap-2"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmDispatch}
              className="gap-2 bg-status-success hover:bg-status-success/90"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar y Generar Carta Porte
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
