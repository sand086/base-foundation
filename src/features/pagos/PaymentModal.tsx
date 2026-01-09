import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { CreditCard, Landmark, AlertCircle } from 'lucide-react';
import { mockBankAccounts } from '@/data/tesoreriaData';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormData) => void;
  suppliers: { id: string; razonSocial: string }[];
}

export interface PaymentFormData {
  proveedor: string;
  folioFactura: string;
  monto: number;
  metodoPago: string;
  cuentaOrigen: string;
  referencia: string;
}

const metodosPago = [
  { value: 'transferencia', label: 'Transferencia Bancaria' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'efectivo', label: 'Efectivo' },
];

export function PaymentModal({ open, onOpenChange, onSubmit, suppliers }: PaymentModalProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    proveedor: '',
    folioFactura: '',
    monto: 0,
    metodoPago: '',
    cuentaOrigen: '',
    referencia: '',
  });

  const [showAccountWarning, setShowAccountWarning] = useState(false);

  const activeAccounts = mockBankAccounts.filter(a => a.estatus === 'activo');

  const handleSubmit = () => {
    if (!formData.cuentaOrigen) {
      setShowAccountWarning(true);
      return;
    }
    onSubmit(formData);
    setFormData({
      proveedor: '',
      folioFactura: '',
      monto: 0,
      metodoPago: '',
      cuentaOrigen: '',
      referencia: '',
    });
    setShowAccountWarning(false);
    onOpenChange(false);
  };

  const selectedAccount = activeAccounts.find(a => a.id === formData.cuentaOrigen);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Proveedor
            </Label>
            <Select
              value={formData.proveedor}
              onValueChange={(value) => setFormData({ ...formData, proveedor: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    {s.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folio y Monto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Folio Factura
              </Label>
              <Input
                placeholder="Ej: A-1234"
                value={formData.folioFactura}
                onChange={(e) => setFormData({ ...formData, folioFactura: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Monto
              </Label>
              <Input
                type="number"
                placeholder="$0.00"
                value={formData.monto || ''}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Método de Pago
            </Label>
            <Select
              value={formData.metodoPago}
              onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {metodosPago.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-sm">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CRITICAL: Cuenta de Origen */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Landmark className="h-3 w-3" />
              Cuenta de Origen
              <span className="text-status-danger">*</span>
            </Label>
            <Select
              value={formData.cuentaOrigen}
              onValueChange={(value) => {
                setFormData({ ...formData, cuentaOrigen: value });
                setShowAccountWarning(false);
              }}
            >
              <SelectTrigger className={`h-10 text-sm ${showAccountWarning ? 'border-status-danger ring-1 ring-status-danger' : ''}`}>
                <SelectValue placeholder="Seleccionar cuenta bancaria" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{account.bancoLogo}</span>
                      <span className="font-medium">{account.alias}</span>
                      <span className="text-muted-foreground text-xs">
                        - {account.banco} (****{account.numeroCuenta.slice(-4)})
                      </span>
                      <span className={`ml-auto text-[10px] font-bold ${
                        account.moneda === 'MXN' ? 'text-brand-green' : 'text-status-info'
                      }`}>
                        {account.moneda}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {showAccountWarning && (
              <div className="flex items-center gap-2 text-status-danger text-xs mt-1">
                <AlertCircle className="h-3 w-3" />
                Debe seleccionar una cuenta de origen para el pago
              </div>
            )}

            {selectedAccount && (
              <div className="p-2 bg-muted/50 rounded border text-xs mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo disponible:</span>
                  <span className="font-medium text-brand-dark">
                    ${(selectedAccount.saldo || 0).toLocaleString(selectedAccount.moneda === 'MXN' ? 'es-MX' : 'en-US')} {selectedAccount.moneda}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Referencia / Número de Transacción
            </Label>
            <Input
              placeholder="Ej: REF-2025-001"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-9 text-sm bg-brand-green hover:bg-brand-green/90 text-white"
            disabled={!formData.proveedor || !formData.monto || !formData.metodoPago}
          >
            Registrar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
