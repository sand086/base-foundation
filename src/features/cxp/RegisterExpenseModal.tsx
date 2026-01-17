import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Calendar, DollarSign } from 'lucide-react';
import { PayableInvoice, Supplier, calculateDueDate } from './types';
import { creditDaysOptions } from './data';

interface RegisterExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (invoice: Omit<PayableInvoice, 'id' | 'pagos' | 'estatus'>) => void;
  suppliers: Supplier[];
  editInvoice?: PayableInvoice | null;
}

export function RegisterExpenseModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  suppliers,
  editInvoice 
}: RegisterExpenseModalProps) {
  const [formData, setFormData] = useState({
    proveedorId: '',
    concepto: '',
    montoTotal: 0,
    fechaEmision: new Date().toISOString().split('T')[0],
    diasCredito: 30,
    moneda: 'MXN' as 'MXN' | 'USD',
    uuid: '',
    pdfUrl: '',
    xmlUrl: '',
  });

  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Calculate due date whenever emission date or credit days change
  useEffect(() => {
    if (formData.fechaEmision && formData.diasCredito !== undefined) {
      const dueDate = calculateDueDate(formData.fechaEmision, formData.diasCredito);
      setFechaVencimiento(dueDate);
    }
  }, [formData.fechaEmision, formData.diasCredito]);

  // Populate form when editing
  useEffect(() => {
    if (editInvoice) {
      setFormData({
        proveedorId: editInvoice.proveedorId,
        concepto: editInvoice.concepto,
        montoTotal: editInvoice.montoTotal,
        fechaEmision: editInvoice.fechaEmision,
        diasCredito: editInvoice.diasCredito,
        moneda: editInvoice.moneda,
        uuid: editInvoice.uuid,
        pdfUrl: editInvoice.pdfUrl || '',
        xmlUrl: editInvoice.xmlUrl || '',
      });
    } else {
      // Reset form
      setFormData({
        proveedorId: '',
        concepto: '',
        montoTotal: 0,
        fechaEmision: new Date().toISOString().split('T')[0],
        diasCredito: 30,
        moneda: 'MXN',
        uuid: '',
        pdfUrl: '',
        xmlUrl: '',
      });
    }
  }, [editInvoice, open]);

  const selectedSupplier = suppliers.find(s => s.id === formData.proveedorId);
  
  // Determine if editing is restricted (has payments)
  const isAmountLocked = editInvoice && (editInvoice.estatus === 'pagado' || editInvoice.estatus === 'pago_parcial');
  const isProviderLocked = isAmountLocked;

  const handleSubmit = () => {
    if (!formData.proveedorId || !formData.montoTotal || !formData.uuid) {
      return;
    }

    const supplier = suppliers.find(s => s.id === formData.proveedorId);
    
    onSubmit({
      proveedor: supplier?.razonSocial || '',
      proveedorId: formData.proveedorId,
      concepto: formData.concepto,
      montoTotal: formData.montoTotal,
      saldoPendiente: editInvoice ? editInvoice.saldoPendiente : formData.montoTotal,
      fechaEmision: formData.fechaEmision,
      diasCredito: formData.diasCredito,
      fechaVencimiento,
      moneda: formData.moneda,
      uuid: formData.uuid,
      pdfUrl: formData.pdfUrl,
      xmlUrl: formData.xmlUrl,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <FileText className="h-5 w-5" />
            {editInvoice ? 'Editar Factura' : 'Registrar Gasto'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Proveedor <span className="text-status-danger">*</span>
            </Label>
            <Select
              value={formData.proveedorId}
              onValueChange={(value) => setFormData({ ...formData, proveedorId: value })}
              disabled={isProviderLocked}
            >
              <SelectTrigger className={`h-10 ${isProviderLocked ? 'bg-muted cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {suppliers.filter(s => s.estatus === 'activo').map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProviderLocked && (
              <p className="text-xs text-muted-foreground">
                ⚠️ No se puede cambiar el proveedor porque ya tiene pagos registrados.
              </p>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Concepto
            </Label>
            <Textarea
              placeholder="Descripción del gasto..."
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="min-h-[60px]"
            />
          </div>

          {/* Monto and Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <DollarSign className="h-3 w-3 inline mr-1" />
                Monto Total <span className="text-status-danger">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.montoTotal || ''}
                onChange={(e) => setFormData({ ...formData, montoTotal: parseFloat(e.target.value) || 0 })}
                className={`h-10 ${isAmountLocked ? 'bg-muted cursor-not-allowed' : ''}`}
                disabled={isAmountLocked}
              />
              {isAmountLocked && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ No se puede editar el monto porque ya tiene pagos.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Moneda
              </Label>
              <Select
                value={formData.moneda}
                onValueChange={(value: 'MXN' | 'USD') => setFormData({ ...formData, moneda: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="MXN">🇲🇽 MXN (Pesos)</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha Emisión y Días Crédito */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Calendar className="h-3 w-3 inline mr-1" />
                Fecha Emisión
              </Label>
              <Input
                type="date"
                value={formData.fechaEmision}
                onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Días de Crédito
              </Label>
              <Select
                value={String(formData.diasCredito)}
                onValueChange={(value) => setFormData({ ...formData, diasCredito: parseInt(value) })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {creditDaysOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha Vencimiento (Calculated) */}
          <div className="p-3 bg-muted/50 rounded-md border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fecha de Vencimiento (calculada):</span>
              <span className="font-semibold text-brand-dark">{fechaVencimiento}</span>
            </div>
          </div>

          {/* UUID / Folio Fiscal */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Folio Fiscal (UUID) <span className="text-status-danger">*</span>
            </Label>
            <Input
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={formData.uuid}
              onChange={(e) => setFormData({ ...formData, uuid: e.target.value })}
              className="h-10 font-mono text-sm"
            />
          </div>

          {/* File Uploads (Simulated) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Upload className="h-3 w-3 inline mr-1" />
                Archivo PDF
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept=".pdf" 
                  className="h-9 text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, pdfUrl: file.name });
                    }
                  }}
                />
              </div>
              {formData.pdfUrl && (
                <p className="text-xs text-muted-foreground">📄 {formData.pdfUrl}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Upload className="h-3 w-3 inline mr-1" />
                Archivo XML
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept=".xml" 
                  className="h-9 text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, xmlUrl: file.name });
                    }
                  }}
                />
              </div>
              {formData.xmlUrl && (
                <p className="text-xs text-muted-foreground">📄 {formData.xmlUrl}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand-green hover:bg-brand-green/90 text-white"
            disabled={!formData.proveedorId || !formData.montoTotal || !formData.uuid}
          >
            {editInvoice ? 'Guardar Cambios' : 'Registrar Factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
