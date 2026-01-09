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
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface Checkpoint {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'ok' | 'pending' | 'error';
  details?: string;
}

// Mock trip data for closure
const mockTripForClosure = {
  id: 'SRV-2025-001',
  clientName: 'Corporativo Logístico Alfa',
  unitNumber: 'TR-204',
  operator: 'Juan Pérez González',
  origin: 'CDMX',
  destination: 'Monterrey',
  fechaSalida: '2025-01-08 08:00',
  fechaLlegada: '2025-01-08 18:30',
  kmsRecorridos: 942,
};

export default function CierreViaje() {
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
      status: 'pending',
      details: 'Pendiente validación de 2 cargas',
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

  const handleLiquidar = () => {
    toast({
      title: "Operador Liquidado",
      description: `Viaje ${mockTripForClosure.id} cerrado exitosamente. Liquidación generada para ${mockTripForClosure.operator}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" /> Cierre de Viaje
        </h1>
        <p className="text-muted-foreground">Validación de checkpoints para liquidación</p>
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
              <p className="font-bold text-lg">{mockTripForClosure.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{mockTripForClosure.clientName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" /> Unidad
              </p>
              <p className="font-mono font-bold">{mockTripForClosure.unitNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Operador
              </p>
              <p className="font-medium">{mockTripForClosure.operator}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ruta
              </p>
              <p className="font-medium">{mockTripForClosure.origin} → {mockTripForClosure.destination}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fecha Salida</p>
              <p className="font-medium">{mockTripForClosure.fechaSalida}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fecha Llegada</p>
              <p className="font-medium">{mockTripForClosure.fechaLlegada}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Kms Recorridos</p>
              <p className="font-bold text-lg">{mockTripForClosure.kmsRecorridos.toLocaleString()} km</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Status Summary */}
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
                    ? 'Todos los checkpoints completados' 
                    : 'Checkpoints pendientes de validación'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {allCheckpointsOk 
                    ? 'El viaje puede ser liquidado' 
                    : `${checkpoints.filter(c => c.status !== 'ok').length} checkpoint(s) requieren atención`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg py-1 px-3">
                {checkpoints.filter(c => c.status === 'ok').length} / {checkpoints.length} OK
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidation Summary & Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Resumen de Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="p-4 bg-muted/30 rounded-md">
              <p className="text-sm text-muted-foreground">Combustible Total</p>
              <p className="text-xl font-bold">$8,450.00</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-md">
              <p className="text-sm text-muted-foreground">Casetas Total</p>
              <p className="text-xl font-bold">$1,250.00</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-md">
              <p className="text-sm text-muted-foreground">Viáticos</p>
              <p className="text-xl font-bold">$850.00</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-md border border-primary/30">
              <p className="text-sm text-muted-foreground">Neto a Liquidar</p>
              <p className="text-xl font-bold text-primary">$10,550.00</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>Haz clic en los checkpoints para cambiar su estado (simulación)</p>
            </div>
            <Button 
              size="lg" 
              className="gap-2"
              disabled={!allCheckpointsOk}
              onClick={handleLiquidar}
            >
              <DollarSign className="h-5 w-5" />
              Liquidar Operador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
