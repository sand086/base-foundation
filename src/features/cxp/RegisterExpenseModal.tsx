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
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Calendar, DollarSign, AlertCircle, Plus } from 'lucide-react';
import { 
  PayableInvoice, 
  Supplier, 
  calculateDueDate, 
  ClasificacionFinanciera,
  IndirectCategory,
  getClasificacionLabel,
  mockTrips,
  mockUnits,
  defaultIndirectCategories,
} from './types';
import { creditDaysOptions } from './data';
import { toast } from 'sonner';

interface RegisterExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (invoice: Omit<PayableInvoice, 'id' | 'pagos' | 'estatus'>) => void;
  suppliers: Supplier[];
  editInvoice?: PayableInvoice | null;
  // Pre-filled data from Compras conversion
  prefillData?: {
    proveedor: string;
    proveedorId: string;
    concepto: string;
    montoTotal: number;
    ordenCompraId: string;
    ordenCompraFolio: string;
  } | null;
}

export function RegisterExpenseModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  suppliers,
  editInvoice,
  prefillData,
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
    // Financial classification fields
    clasificacion: '' as ClasificacionFinanciera | '',
    viajeId: '',
    unidadId: '',
    categoriaIndirectoId: '',
    // Origin from Compras
    ordenCompraId: '',
    ordenCompraFolio: '',
  });

  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [indirectCategories, setIndirectCategories] = useState<IndirectCategory[]>(defaultIndirectCategories);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate due date whenever emission date or credit days change
  useEffect(() => {
    if (formData.fechaEmision && formData.diasCredito !== undefined) {
      const dueDate = calculateDueDate(formData.fechaEmision, formData.diasCredito);
      setFechaVencimiento(dueDate);
    }
  }, [formData.fechaEmision, formData.diasCredito]);

  // Handle prefill data from Compras conversion
  useEffect(() => {
    if (prefillData && open) {
      setFormData(prev => ({
        ...prev,
        proveedorId: prefillData.proveedorId,
        concepto: prefillData.concepto,
        montoTotal: prefillData.montoTotal,
        ordenCompraId: prefillData.ordenCompraId,
        ordenCompraFolio: prefillData.ordenCompraFolio,
      }));
    }
  }, [prefillData, open]);

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
        clasificacion: editInvoice.clasificacion || '',
        viajeId: editInvoice.viajeId || '',
        unidadId: editInvoice.unidadId || '',
        categoriaIndirectoId: editInvoice.categoriaIndirectoId || '',
        ordenCompraId: editInvoice.ordenCompraId || '',
        ordenCompraFolio: editInvoice.ordenCompraFolio || '',
      });
    } else if (!prefillData) {
      // Reset form only if no prefill data
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
        clasificacion: '',
        viajeId: '',
        unidadId: '',
        categoriaIndirectoId: '',
        ordenCompraId: '',
        ordenCompraFolio: '',
      });
    }
    setValidationErrors([]);
  }, [editInvoice, open, prefillData]);

  const selectedSupplier = suppliers.find(s => s.id === formData.proveedorId);
  
  // Determine if editing is restricted (has payments)
  const isAmountLocked = editInvoice && (editInvoice.estatus === 'pagado' || editInvoice.estatus === 'pago_parcial');
  const isProviderLocked = isAmountLocked;

  // Validate form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.proveedorId) errors.push('Selecciona un proveedor');
    if (!formData.montoTotal || formData.montoTotal <= 0) errors.push('El monto debe ser mayor a 0');
    if (!formData.uuid) errors.push('El UUID/Folio fiscal es obligatorio');
    if (!formData.clasificacion) errors.push('La clasificación financiera es obligatoria');

    // Validate based on classification type
    if (formData.clasificacion === 'costo_directo_viaje' && !formData.viajeId) {
      errors.push('Debes vincular un viaje para Costo Directo de Viaje');
    }
    if (formData.clasificacion === 'costo_mantenimiento' && !formData.unidadId) {
      errors.push('Debes vincular una unidad para Costo de Mantenimiento');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Add new indirect category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const tipoCategoria = formData.clasificacion === 'gasto_indirecto_fijo' ? 'fijo' : 'variable';
    const newCategory: IndirectCategory = {
      id: `cat-${Date.now()}`,
      nombre: newCategoryName.trim(),
      tipo: tipoCategoria,
    };

    setIndirectCategories([...indirectCategories, newCategory]);
    setFormData({ ...formData, categoriaIndirectoId: newCategory.id });
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    toast.success(`Categoría "${newCategory.nombre}" creada`);
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Corrige los errores antes de continuar');
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
      clasificacion: formData.clasificacion as ClasificacionFinanciera,
      viajeId: formData.viajeId || undefined,
      unidadId: formData.unidadId || undefined,
      categoriaIndirectoId: formData.categoriaIndirectoId || undefined,
      ordenCompraId: formData.ordenCompraId || undefined,
      ordenCompraFolio: formData.ordenCompraFolio || undefined,
    });

    onOpenChange(false);
  };

  // Filter categories based on classification type
  const filteredCategories = indirectCategories.filter(cat => {
    if (formData.clasificacion === 'gasto_indirecto_fijo') return cat.tipo === 'fijo';
    if (formData.clasificacion === 'gasto_indirecto_variable') return cat.tipo === 'variable';
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <FileText className="h-5 w-5" />
            {editInvoice ? 'Editar Factura' : 'Registrar Gasto'}
            {formData.ordenCompraFolio && (
              <Badge variant="outline" className="ml-2 text-xs">
                Origen: {formData.ordenCompraFolio}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Errores de validación:</p>
                <ul className="list-disc list-inside text-xs text-red-700 mt-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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

          {/* Financial Classification - REQUIRED */}
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Clasificación Financiera <span className="text-status-danger">*</span>
              </Label>
              <Select
                value={formData.clasificacion}
                onValueChange={(value: ClasificacionFinanciera) => {
                  setFormData({ 
                    ...formData, 
                    clasificacion: value,
                    viajeId: '',
                    unidadId: '',
                    categoriaIndirectoId: '',
                  });
                  setValidationErrors([]);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecciona la clasificación" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="costo_directo_viaje">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Costo Directo de Viaje
                    </div>
                  </SelectItem>
                  <SelectItem value="costo_mantenimiento">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Costo de Mantenimiento
                    </div>
                  </SelectItem>
                  <SelectItem value="gasto_indirecto_fijo">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Gasto Indirecto Fijo
                    </div>
                  </SelectItem>
                  <SelectItem value="gasto_indirecto_variable">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Gasto Indirecto Variable
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields based on classification */}
            {formData.clasificacion === 'costo_directo_viaje' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Viaje Asociado <span className="text-status-danger">*</span>
                </Label>
                <Select
                  value={formData.viajeId}
                  onValueChange={(value) => setFormData({ ...formData, viajeId: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecciona el viaje" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {mockTrips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        <span className="font-mono text-xs mr-2">{trip.folio}</span>
                        {trip.origen} → {trip.destino}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600">
                  ℹ️ Este gasto se imputará al costo del viaje seleccionado
                </p>
              </div>
            )}

            {formData.clasificacion === 'costo_mantenimiento' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Unidad Económica <span className="text-status-danger">*</span>
                </Label>
                <Select
                  value={formData.unidadId}
                  onValueChange={(value) => setFormData({ ...formData, unidadId: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecciona la unidad" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {mockUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        <span className="font-mono font-medium mr-2">{unit.economico}</span>
                        {unit.tipo} - {unit.placas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600">
                  ℹ️ Este gasto se asociará al historial de mantenimiento de la unidad
                </p>
              </div>
            )}

            {(formData.clasificacion === 'gasto_indirecto_fijo' || formData.clasificacion === 'gasto_indirecto_variable') && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Categoría de Gasto
                </Label>
                {!showNewCategoryInput ? (
                  <Select
                    value={formData.categoriaIndirectoId}
                    onValueChange={(value) => {
                      if (value === '__new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        setFormData({ ...formData, categoriaIndirectoId: value });
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="h-3 w-3" />
                          Crear nueva categoría...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la nueva categoría"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-10"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddCategory} className="h-10">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      className="h-10"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
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
          >
            {editInvoice ? 'Guardar Cambios' : 'Registrar Factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
