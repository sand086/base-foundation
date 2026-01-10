import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { unidadesCombustible, operadoresCombustible, PRECIOS_PROMEDIO, type TipoCombustible } from '@/data/combustibleData';
import { toast } from 'sonner';
import { Fuel, Camera, CheckCircle2, Upload, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => void;
}

export interface TicketFormData {
  unidadId: string;
  operadorId: string;
  fechaHora: string;
  estacion: string;
  tipoCombustible: TipoCombustible;
  litros: number;
  precioPorLitro: number;
  odometro: number;
  evidencia: File | null;
}

export function AddTicketModal({ open, onOpenChange, onSubmit }: AddTicketModalProps) {
  const [formData, setFormData] = useState<TicketFormData>({
    unidadId: '',
    operadorId: '',
    fechaHora: new Date().toISOString().slice(0, 16),
    estacion: '',
    tipoCombustible: 'diesel',
    litros: 0,
    precioPorLitro: PRECIOS_PROMEDIO.diesel,
    odometro: 0,
    evidencia: null,
  });

  // Update default price when fuel type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      precioPorLitro: PRECIOS_PROMEDIO[prev.tipoCombustible],
    }));
  }, [formData.tipoCombustible]);

  const total = formData.litros * formData.precioPorLitro;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.unidadId || !formData.operadorId || !formData.estacion || formData.litros <= 0) {
      toast.error('Campos requeridos', {
        description: 'Por favor complete todos los campos obligatorios.',
      });
      return;
    }

    onSubmit(formData);
    setFormData({
      unidadId: '',
      operadorId: '',
      fechaHora: new Date().toISOString().slice(0, 16),
      estacion: '',
      tipoCombustible: 'diesel',
      litros: 0,
      precioPorLitro: PRECIOS_PROMEDIO.diesel,
      odometro: 0,
      evidencia: null,
    });
    onOpenChange(false);
  };

  const selectedUnit = unidadesCombustible.find(u => u.id === formData.unidadId);
  const tankCapacity = selectedUnit 
    ? (formData.tipoCombustible === 'diesel' 
        ? selectedUnit.capacidadTanqueDiesel 
        : selectedUnit.capacidadTanqueUrea)
    : 0;
  const isOverCapacity = selectedUnit && formData.litros > tankCapacity;

  const getFuelTypeStyles = (type: TipoCombustible, isSelected: boolean) => {
    if (type === 'diesel') {
      return isSelected 
        ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
        : 'border-amber-300 text-amber-700 hover:bg-amber-50';
    }
    return isSelected 
      ? 'bg-sky-500 text-white border-sky-500 shadow-md' 
      : 'border-sky-300 text-sky-700 hover:bg-sky-50';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center transition-colors",
              formData.tipoCombustible === 'diesel' ? 'bg-amber-100' : 'bg-sky-100'
            )}>
              {formData.tipoCombustible === 'diesel' 
                ? <Fuel className="h-4 w-4 text-amber-600" />
                : <Droplets className="h-4 w-4 text-sky-600" />
              }
            </div>
            Agregar Ticket de Combustible
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Fuel Type Selection - Visual Toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tipo de Combustible *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipoCombustible: 'diesel', litros: 0 })}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200",
                  getFuelTypeStyles('diesel', formData.tipoCombustible === 'diesel')
                )}
              >
                <Fuel className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Diesel</div>
                  <div className="text-xs opacity-80">Tanque hasta {selectedUnit?.capacidadTanqueDiesel || '---'}L</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipoCombustible: 'urea', litros: 0 })}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200",
                  getFuelTypeStyles('urea', formData.tipoCombustible === 'urea')
                )}
              >
                <Droplets className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Urea/DEF</div>
                  <div className="text-xs opacity-80">Tanque hasta {selectedUnit?.capacidadTanqueUrea || '---'}L</div>
                </div>
              </button>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Unidad *
            </Label>
            <Select
              value={formData.unidadId}
              onValueChange={(value) => setFormData({ ...formData, unidadId: value })}
            >
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {unidadesCombustible.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="text-sm">
                    {unit.numero} (D: {unit.capacidadTanqueDiesel}L / U: {unit.capacidadTanqueUrea}L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Operador *
            </Label>
            <Select
              value={formData.operadorId}
              onValueChange={(value) => setFormData({ ...formData, operadorId: value })}
            >
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Seleccionar operador" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {operadoresCombustible.map((op) => (
                  <SelectItem key={op.id} value={op.id} className="text-sm">
                    {op.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha y Hora *
            </Label>
            <Input
              type="datetime-local"
              value={formData.fechaHora}
              onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
              className="h-11 text-sm"
            />
          </div>

          {/* Station Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estación *
            </Label>
            <Input
              placeholder={formData.tipoCombustible === 'diesel' 
                ? "Ej: OXXO Gas - Querétaro Norte" 
                : "Ej: AdBlue Center - Querétaro"}
              value={formData.estacion}
              onChange={(e) => setFormData({ ...formData, estacion: e.target.value })}
              className="h-11 text-sm"
            />
          </div>

          {/* Liters and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Litros *
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.litros || ''}
                onChange={(e) => setFormData({ ...formData, litros: parseFloat(e.target.value) || 0 })}
                className={cn(
                  "h-11 text-sm",
                  isOverCapacity && 'border-status-danger focus-visible:ring-status-danger'
                )}
              />
              {isOverCapacity && (
                <p className="text-xs text-status-danger">
                  ⚠️ Excede capacidad del tanque de {formData.tipoCombustible === 'diesel' ? 'Diesel' : 'Urea'} ({tankCapacity}L)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Precio/Litro (MXN)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.precioPorLitro || ''}
                onChange={(e) => setFormData({ ...formData, precioPorLitro: parseFloat(e.target.value) || 0 })}
                className="h-11 text-sm"
              />
            </div>
          </div>

          {/* Total (Auto-calculated) */}
          <div className={cn(
            "rounded-lg p-4 border transition-colors",
            formData.tipoCombustible === 'diesel' ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200'
          )}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {formData.tipoCombustible === 'diesel' 
                  ? <Fuel className="h-4 w-4 text-amber-600" />
                  : <Droplets className="h-4 w-4 text-sky-600" />
                }
                <span className="text-sm text-muted-foreground">Total {formData.tipoCombustible === 'diesel' ? 'Diesel' : 'Urea'}:</span>
              </div>
              <span className={cn(
                "text-xl font-bold",
                formData.tipoCombustible === 'diesel' ? 'text-amber-700' : 'text-sky-700'
              )}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Lectura de Odómetro (km)
            </Label>
            <Input
              type="number"
              placeholder="Ej: 245890"
              value={formData.odometro || ''}
              onChange={(e) => setFormData({ ...formData, odometro: parseInt(e.target.value) || 0 })}
              className="h-11 text-sm"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Foto del Ticket
            </Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id="ticket-photo-modal"
                onChange={(e) => setFormData({ ...formData, evidencia: e.target.files?.[0] || null })}
              />
              <label htmlFor="ticket-photo-modal" className="cursor-pointer block">
                {formData.evidencia ? (
                  <div className="flex items-center justify-center gap-2 text-status-success">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="font-medium text-sm">{formData.evidencia.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-sm">Toca para tomar foto o seleccionar archivo</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG hasta 5MB</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 text-sm flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn(
                "h-11 text-sm flex-1 gap-2",
                formData.tipoCombustible === 'diesel' 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              )}
            >
              <Upload className="h-4 w-4" />
              Registrar {formData.tipoCombustible === 'diesel' ? 'Diesel' : 'Urea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
