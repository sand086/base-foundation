import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Receipt, 
  Calendar, 
  User, 
  Link2,
  Landmark,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MovimientoBancario } from '@/data/tesoreriaData';
import { useNavigate } from 'react-router-dom';

interface MovementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MovimientoBancario | null;
}

export function MovementDetailModal({ open, onOpenChange, movement }: MovementDetailModalProps) {
  const navigate = useNavigate();
  
  if (!movement) return null;

  const isIngreso = movement.tipo === 'ingreso';
  
  const getModuleRoute = () => {
    if (movement.origenModulo === 'CxC') return '/cuentas-por-cobrar';
    if (movement.origenModulo === 'CxP') return '/proveedores-cxp';
    return null;
  };

  const handleGoToInvoice = () => {
    const route = getModuleRoute();
    if (route) {
      navigate(route);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <Receipt className="h-5 w-5" />
            Detalle del Movimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Header with Amount */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monto</p>
              <p className={`text-2xl font-bold ${isIngreso ? 'text-emerald-700' : 'text-red-700'}`}>
                {isIngreso ? '+' : '-'}${movement.monto.toLocaleString('es-MX')}
                <span className="text-sm ml-1">{movement.moneda}</span>
              </p>
            </div>
            <StatusBadge status={isIngreso ? 'success' : 'danger'}>
              {isIngreso ? 'INGRESO' : 'EGRESO'}
            </StatusBadge>
          </div>

          {/* Concepto */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Concepto</p>
            <p className="text-sm font-medium text-brand-dark">{movement.concepto}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha Movimiento
              </div>
              <p className="font-medium text-sm">{movement.fecha}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Landmark className="h-3 w-3" />
                Cuenta
              </div>
              <p className="font-medium text-sm">{movement.banco}</p>
              <p className="text-xs text-muted-foreground">{movement.cuentaBancaria}</p>
            </div>
          </div>

          {/* Referencia Bancaria */}
          <div className="p-3 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Referencia Bancaria</p>
            <p className="font-mono font-bold text-amber-800">{movement.referenciaBancaria}</p>
          </div>

          {/* Origen/Módulo */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Origen / Módulo</p>
              <p className="font-medium text-blue-800">{movement.origenModulo}</p>
              {movement.facturaFolio && (
                <p className="text-xs text-blue-600 font-mono">Folio: {movement.facturaFolio}</p>
              )}
            </div>
            {movement.facturaRelacionada && getModuleRoute() && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGoToInvoice}
                className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Link2 className="h-3 w-3" />
                Ir a Factura
              </Button>
            )}
          </div>

          {/* Registrado Por */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                Registrado por
              </div>
              <p className="font-medium text-sm">{movement.registradoPor}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Fecha Registro
              </div>
              <p className="font-medium text-sm">{movement.fechaRegistro}</p>
            </div>
          </div>

          {/* Conciliation Status */}
          <div className={`flex items-center gap-3 p-3 rounded border ${
            movement.conciliado 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            {movement.conciliado ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className={`font-medium text-sm ${movement.conciliado ? 'text-emerald-700' : 'text-amber-700'}`}>
                {movement.conciliado ? 'Conciliado' : 'Pendiente de Conciliar'}
              </p>
              {movement.fechaConciliacion && (
                <p className="text-xs text-emerald-600">
                  Conciliado el {movement.fechaConciliacion}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
