import { 
  Receipt, 
  CheckCircle, 
  Download, 
  Printer,
  User,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TripSettlement, ConceptoPago } from "@/data/liquidacionData";

interface SettlementReceiptModalProps {
  open: boolean;
  onClose: () => void;
  settlement: TripSettlement;
  authorizationDate: string;
  authorizationUser: string;
}

export function SettlementReceiptModal({
  open,
  onClose,
  settlement,
  authorizationDate,
  authorizationUser,
}: SettlementReceiptModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const ingresos = settlement.conceptos.filter(c => c.tipo === 'ingreso');
  const deducciones = settlement.conceptos.filter(c => c.tipo === 'deduccion');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recibo de Liquidación
          </DialogTitle>
          <DialogDescription>
            Comprobante de pago autorizado
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content */}
        <div className="bg-white border-2 border-dashed border-muted rounded-lg p-6 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-primary">RÁPIDOS 3T</h2>
            <p className="text-sm text-muted-foreground">Sistema de Transporte</p>
            <Badge className="mt-2 bg-status-success text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              LIQUIDADO
            </Badge>
          </div>

          {/* Trip Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Folio Viaje:</span>
                <span className="font-bold">{settlement.viajeId}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Operador:</span>
                <span className="font-medium">{settlement.operadorNombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Unidad:</span>
                <span className="font-mono font-bold">{settlement.unidadNumero}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ruta:</span>
                <span className="font-medium">{settlement.ruta}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{settlement.fechaViaje}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground ml-6">Kms:</span>
                <span className="font-bold">{settlement.kmsRecorridos.toLocaleString()} km</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Income Section */}
          <div>
            <h3 className="font-bold text-status-success mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> INGRESOS
            </h3>
            <div className="space-y-2">
              {ingresos.map((concepto) => (
                <div key={concepto.id} className="flex justify-between text-sm">
                  <div>
                    <span>{concepto.descripcion}</span>
                    {concepto.referencia && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({concepto.referencia})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-status-success">
                    +{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Subtotal Ingresos</span>
                <span className="font-mono text-status-success">
                  {formatCurrency(settlement.totalIngresos)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deductions Section */}
          <div>
            <h3 className="font-bold text-status-danger mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> DEDUCCIONES
            </h3>
            <div className="space-y-2">
              {deducciones.map((concepto) => (
                <div key={concepto.id} className="flex justify-between text-sm">
                  <div>
                    <span className={concepto.categoria === 'combustible' ? 'text-status-danger font-medium' : ''}>
                      {concepto.descripcion}
                    </span>
                    {concepto.referencia && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({concepto.referencia})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-status-danger">
                    -{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Subtotal Deducciones</span>
                <span className="font-mono text-status-danger">
                  -{formatCurrency(settlement.totalDeducciones)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="border-2" />

          {/* Total */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-bold">NETO A PAGAR</span>
                <p className="text-sm text-muted-foreground">
                  Autorizado: {authorizationDate} por {authorizationUser}
                </p>
              </div>
              <span className="text-2xl font-bold text-primary font-mono">
                {formatCurrency(settlement.netoAPagar)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-dashed">
            <p>Este documento es un comprobante de liquidación generado automáticamente.</p>
            <p className="mt-1">Rápidos 3T © 2025 - Sistema de Gestión de Transporte</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
