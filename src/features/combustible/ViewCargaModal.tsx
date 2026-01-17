import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Fuel, 
  Droplets, 
  Truck, 
  User, 
  MapPin, 
  Calendar, 
  Gauge, 
  DollarSign,
  AlertTriangle,
  Image,
  ImageOff,
} from 'lucide-react';
import { CargaCombustible } from '@/data/combustibleData';
import { cn } from '@/lib/utils';

interface ViewCargaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: CargaCombustible | null;
}

export function ViewCargaModal({ open, onOpenChange, carga }: ViewCargaModalProps) {
  if (!carga) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {carga.tipoCombustible === 'diesel' ? (
              <Fuel className="h-5 w-5 text-amber-600" />
            ) : (
              <Droplets className="h-5 w-5 text-sky-600" />
            )}
            Detalle de Carga
          </DialogTitle>
          <DialogDescription>
            Ticket ID: {carga.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alert Banner if exceeds tank */}
          {carga.excedeTanque && (
            <div className="flex items-center gap-2 p-3 bg-status-warning-bg border border-status-warning-border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-status-warning" />
              <span className="text-sm font-medium text-status-warning">
                Carga excede capacidad del tanque ({carga.capacidadTanque}L)
              </span>
            </div>
          )}

          {/* Type Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 font-medium text-base px-3 py-1",
                carga.tipoCombustible === 'diesel' 
                  ? 'bg-amber-100 text-amber-700 border-amber-300' 
                  : 'bg-sky-100 text-sky-700 border-sky-300'
              )}
            >
              {carga.tipoCombustible === 'diesel' ? (
                <><Fuel className="h-4 w-4" /> Diesel</>
              ) : (
                <><Droplets className="h-4 w-4" /> Urea/DEF</>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {carga.fechaHora}
            </span>
          </div>

          <Separator />

          {/* Main Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Truck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Unidad</p>
                <p className="font-mono font-bold">{carga.unidadNumero}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Operador</p>
                <p className="font-medium text-sm">{carga.operadorNombre}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Estación</p>
              <p className="font-medium">{carga.estacion}</p>
            </div>
          </div>

          <Separator />

          {/* Fuel Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Litros</p>
              <p className={cn(
                "text-2xl font-bold font-mono",
                carga.excedeTanque ? "text-status-warning" : "text-primary"
              )}>
                {carga.litros.toFixed(1)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Precio/L</p>
              <p className="text-2xl font-bold font-mono">${carga.precioPorLitro.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-status-success-bg rounded-lg border border-status-success-border">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold font-mono text-status-success">
                ${carga.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Odometer & Evidence */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Gauge className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Odómetro</p>
                <p className="font-mono font-bold">{carga.odometro.toLocaleString()} km</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {carga.tieneEvidencia ? (
                <>
                  <div className="w-8 h-8 rounded bg-status-success-bg flex items-center justify-center">
                    <Image className="h-4 w-4 text-status-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Evidencia</p>
                    <p className="font-medium text-status-success">Disponible</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Evidencia</p>
                    <p className="font-medium text-muted-foreground">No disponible</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Evidence Preview if available */}
          {carga.tieneEvidencia && carga.evidenciaUrl && (
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={carga.evidenciaUrl} 
                alt="Evidencia de carga" 
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
