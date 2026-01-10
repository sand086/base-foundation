import { useState } from "react";
import { 
  FileCheck, 
  Camera, 
  Fuel, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck, 
  User, 
  MapPin,
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeAlert,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  mockTripSettlement, 
  TripSettlement, 
  ConceptoPago,
} from "@/data/liquidacionData";
import { SettlementReceiptModal } from "@/features/cierre/SettlementReceiptModal";

interface Checkpoint {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'ok' | 'pending' | 'error';
  details?: string;
}

export default function CierreViaje() {
  const [settlement, setSettlement] = useState<TripSettlement>(mockTripSettlement);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    {
      id: 'pod',
      title: 'POD / Evidencias',
      description: 'Prueba de entrega y fotografías',
      icon: Camera,
      status: 'ok',
      details: '3 fotos cargadas, firma digital recibida',
    },
    {
      id: 'combustible',
      title: 'Combustible',
      description: 'Conciliación ECM vs Ticket',
      icon: Fuel,
      status: settlement.diferenciaLitros > 0 ? 'pending' : 'ok',
      details: settlement.diferenciaLitros > 0 
        ? `Exceso detectado: ${settlement.diferenciaLitros}L - Vale generado`
        : 'Consumo dentro de tolerancia',
    },
    {
      id: 'casetas',
      title: 'Casetas',
      description: 'Cruces de caseta y pagos',
      icon: CreditCard,
      status: 'ok',
      details: '4 casetas registradas - $1,250 MXN',
    },
  ]);

  const allCheckpointsOk = checkpoints.every((cp) => cp.status === 'ok');

  const toggleCheckpoint = (id: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === id
          ? { ...cp, status: cp.status === 'ok' ? 'pending' : 'ok' }
          : cp
      )
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-8 w-8 text-status-success" />;
      case 'pending':
        return <Clock className="h-8 w-8 text-status-warning" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-status-danger" />;
      default:
        return <Clock className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-status-success text-white">Completo</Badge>;
      case 'pending':
        return <Badge className="bg-status-warning text-black">Pendiente</Badge>;
      case 'error':
        return <Badge className="bg-status-danger text-white">Error</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleAuthorizeAndClose = () => {
    setIsAnimating(true);
    
    // Simulate authorization process
    setTimeout(() => {
      setSettlement(prev => ({
        ...prev,
        estatus: 'liquidado',
        fechaAutorizacion: new Date().toISOString(),
        autorizadoPor: 'Admin TMS',
      }));
      
      setIsAnimating(false);
      setShowReceipt(true);
      
      toast({
        title: "✅ Viaje Liquidado Exitosamente",
        description: `El operador ${settlement.operadorNombre} recibirá ${formatCurrency(settlement.netoAPagar)}.`,
      });
    }, 1500);
  };

  const ingresos = settlement.conceptos.filter(c => c.tipo === 'ingreso');
  const deducciones = settlement.conceptos.filter(c => c.tipo === 'deduccion');
  const fuelDeduction = deducciones.find(d => d.categoria === 'combustible');

  // Calculate excess percentage
  const excessPercentage = settlement.consumoEsperadoLitros > 0 
    ? ((settlement.diferenciaLitros / settlement.consumoEsperadoLitros) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" /> Cierre de Viaje y Liquidación
        </h1>
        <p className="text-muted-foreground">Validación de checkpoints y cálculo de pago al operador</p>
      </div>

      {/* Trip Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Resumen del Viaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ID Viaje</p>
              <p className="font-bold text-lg">{settlement.viajeId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Operador
              </p>
              <p className="font-medium">{settlement.operadorNombre}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" /> Unidad
              </p>
              <p className="font-mono font-bold">{settlement.unidadNumero}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ruta
              </p>
              <p className="font-medium">{settlement.ruta}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fecha del Viaje</p>
              <p className="font-medium">{settlement.fechaViaje}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Kms Recorridos</p>
              <p className="font-bold text-lg">{settlement.kmsRecorridos.toLocaleString()} km</p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-sm text-muted-foreground">Estatus</p>
              <Badge 
                className={
                  settlement.estatus === 'liquidado' 
                    ? 'bg-status-success text-white' 
                    : settlement.estatus === 'autorizado'
                    ? 'bg-blue-500 text-white'
                    : 'bg-status-warning text-black'
                }
              >
                {settlement.estatus === 'liquidado' ? 'Liquidado' : 
                 settlement.estatus === 'autorizado' ? 'Autorizado' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Reconciliation Alert - Critical Connection */}
      {settlement.diferenciaLitros > 0 && (
        <Card className="border-status-danger border-2 bg-status-danger/5 animate-in fade-in duration-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-status-danger">
              <BadgeAlert className="h-5 w-5" />
              ⚠️ Alerta de Consumo Excesivo - Conexión con Módulo Combustible
            </CardTitle>
            <CardDescription>
              El sistema detectó que el consumo real excedió el consumo esperado para este viaje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Fuel className="h-4 w-4" /> Consumo Esperado
                </div>
                <p className="text-xl font-bold">{settlement.consumoEsperadoLitros} L</p>
                <p className="text-xs text-muted-foreground">
                  {settlement.kmsRecorridos} km ÷ 3.2 km/L
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Droplets className="h-4 w-4" /> Consumo Real (Tickets)
                </div>
                <p className="text-xl font-bold">{settlement.consumoRealLitros} L</p>
                <p className="text-xs text-muted-foreground">
                  Según cargas registradas
                </p>
              </div>
              <div className="p-4 bg-status-danger/10 rounded-lg border border-status-danger">
                <div className="flex items-center gap-2 text-status-danger text-sm mb-1">
                  <TrendingUp className="h-4 w-4" /> Diferencia (Exceso)
                </div>
                <p className="text-xl font-bold text-status-danger">
                  +{settlement.diferenciaLitros} L ({excessPercentage}%)
                </p>
                <p className="text-xs text-muted-foreground">
                  Mayor a tolerancia del 5%
                </p>
              </div>
              <div className="p-4 bg-status-danger/10 rounded-lg border border-status-danger">
                <div className="flex items-center gap-2 text-status-danger text-sm mb-1">
                  <DollarSign className="h-4 w-4" /> Vale de Cobro
                </div>
                <p className="text-xl font-bold text-status-danger">
                  {formatCurrency(settlement.deduccionCombustible)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settlement.diferenciaLitros}L × {formatCurrency(settlement.precioPorLitro)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkpoint Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {checkpoints.map((checkpoint) => {
          const Icon = checkpoint.icon;
          return (
            <Card 
              key={checkpoint.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                checkpoint.status === 'ok' 
                  ? 'border-status-success border-2 bg-status-success/5' 
                  : checkpoint.status === 'pending'
                  ? 'border-status-warning border-2 bg-status-warning/5'
                  : 'border-status-danger border-2 bg-status-danger/5'
              }`}
              onClick={() => toggleCheckpoint(checkpoint.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-md ${
                    checkpoint.status === 'ok' 
                      ? 'bg-status-success/20' 
                      : checkpoint.status === 'pending'
                      ? 'bg-status-warning/20'
                      : 'bg-status-danger/20'
                  }`}>
                    <Icon className={`h-8 w-8 ${
                      checkpoint.status === 'ok' 
                        ? 'text-status-success' 
                        : checkpoint.status === 'pending'
                        ? 'text-status-warning'
                        : 'text-status-danger'
                    }`} />
                  </div>
                  {getStatusIcon(checkpoint.status)}
                </div>
                <h3 className="font-bold text-lg mb-1">{checkpoint.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{checkpoint.description}</p>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{checkpoint.details}</p>
                  {getStatusBadge(checkpoint.status)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Financial Settlement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Liquidación del Operador
          </CardTitle>
          <CardDescription>
            Cálculo: Pago Base + Bonos - Anticipos - Deducción Combustible = Neto a Pagar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Income Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-status-success font-bold">
                <ArrowUpCircle className="h-5 w-5" />
                INGRESOS
              </div>
              <div className="space-y-2">
                {ingresos.map((concepto, index) => (
                  <div 
                    key={concepto.id} 
                    className="flex justify-between items-center p-3 bg-status-success/5 rounded-lg border border-status-success/20 animate-in fade-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div>
                      <p className="font-medium">{concepto.descripcion}</p>
                      {concepto.referencia && (
                        <p className="text-xs text-muted-foreground">{concepto.referencia}</p>
                      )}
                      {concepto.esAutomatico && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Automático
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold font-mono text-status-success">
                      +{formatCurrency(concepto.monto)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between p-3 bg-status-success/10 rounded-lg font-bold">
                <span>Subtotal Ingresos</span>
                <span className="font-mono text-status-success">
                  {formatCurrency(settlement.totalIngresos)}
                </span>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-status-danger font-bold">
                <ArrowDownCircle className="h-5 w-5" />
                DEDUCCIONES
              </div>
              <div className="space-y-2">
                {deducciones.map((concepto, index) => (
                  <div 
                    key={concepto.id} 
                    className={`flex justify-between items-center p-3 rounded-lg border animate-in fade-in slide-in-from-right duration-300 ${
                      concepto.categoria === 'combustible' 
                        ? 'bg-status-danger/10 border-status-danger' 
                        : 'bg-status-danger/5 border-status-danger/20'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div>
                      <p className={`font-medium ${concepto.categoria === 'combustible' ? 'text-status-danger' : ''}`}>
                        {concepto.descripcion}
                      </p>
                      {concepto.referencia && (
                        <p className="text-xs text-muted-foreground">{concepto.referencia}</p>
                      )}
                      {concepto.esAutomatico && (
                        <Badge 
                          variant="outline" 
                          className={`mt-1 text-xs ${concepto.categoria === 'combustible' ? 'border-status-danger text-status-danger' : ''}`}
                        >
                          {concepto.categoria === 'combustible' ? '⚠️ Desde Módulo Combustible' : 'Automático'}
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold font-mono text-status-danger">
                      -{formatCurrency(concepto.monto)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between p-3 bg-status-danger/10 rounded-lg font-bold">
                <span>Subtotal Deducciones</span>
                <span className="font-mono text-status-danger">
                  -{formatCurrency(settlement.totalDeducciones)}
                </span>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <Separator className="my-6" />
          
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Ingresos</p>
              <p className="text-xl font-bold text-status-success font-mono">
                {formatCurrency(settlement.totalIngresos)}
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Deducciones</p>
              <p className="text-xl font-bold text-status-danger font-mono">
                -{formatCurrency(settlement.totalDeducciones)}
              </p>
            </div>
            {fuelDeduction && (
              <div className="p-4 bg-status-danger/10 rounded-lg text-center border border-status-danger">
                <p className="text-sm text-status-danger mb-1 flex items-center justify-center gap-1">
                  <Fuel className="h-3 w-3" /> Deducción Combustible
                </p>
                <p className="text-xl font-bold text-status-danger font-mono">
                  -{formatCurrency(fuelDeduction.monto)}
                </p>
              </div>
            )}
            <div className="p-4 bg-primary/10 rounded-lg text-center border-2 border-primary">
              <p className="text-sm text-primary mb-1 font-medium">NETO A PAGAR</p>
              <p className="text-2xl font-bold text-primary font-mono">
                {formatCurrency(settlement.netoAPagar)}
              </p>
            </div>
          </div>

          {/* Status & Action */}
          <Card className={allCheckpointsOk ? 'border-status-success border-2' : 'border-status-warning border-2'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {allCheckpointsOk ? (
                    <div className="p-3 rounded-full bg-status-success/20">
                      <CheckCircle className="h-8 w-8 text-status-success" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-full bg-status-warning/20">
                      <AlertTriangle className="h-8 w-8 text-status-warning" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">
                      {allCheckpointsOk 
                        ? 'Listo para Autorizar y Cerrar' 
                        : 'Checkpoints pendientes de validación'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {allCheckpointsOk 
                        ? `El operador recibirá ${formatCurrency(settlement.netoAPagar)}` 
                        : `${checkpoints.filter(c => c.status !== 'ok').length} checkpoint(s) requieren atención`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-lg py-1 px-3">
                    {checkpoints.filter(c => c.status === 'ok').length} / {checkpoints.length} OK
                  </Badge>
                  <Button 
                    size="lg" 
                    className="gap-2"
                    disabled={!allCheckpointsOk || isAnimating || settlement.estatus === 'liquidado'}
                    onClick={handleAuthorizeAndClose}
                  >
                    {isAnimating ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Procesando...
                      </>
                    ) : settlement.estatus === 'liquidado' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Liquidado
                      </>
                    ) : (
                      <>
                        <Receipt className="h-5 w-5" />
                        Autorizar y Cerrar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Settlement Receipt Modal */}
      <SettlementReceiptModal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        settlement={settlement}
        authorizationDate={new Date().toLocaleDateString('es-MX')}
        authorizationUser="Admin TMS"
      />
    </div>
  );
}
