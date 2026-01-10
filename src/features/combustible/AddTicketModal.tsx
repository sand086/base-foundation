import { useState } from 'react';
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
import { unidadesCombustible, operadoresCombustible } from '@/data/combustibleData';
import { toast } from 'sonner';
import { Fuel, Camera, CheckCircle2, Upload } from 'lucide-react';

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
    litros: 0,
    precioPorLitro: 0,
    odometro: 0,
    evidencia: null,
  });

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
      litros: 0,
      precioPorLitro: 0,
      odometro: 0,
      evidencia: null,
    });
    onOpenChange(false);
  };

  const selectedUnit = unidadesCombustible.find(u => u.id === formData.unidadId);
  const isOverCapacity = selectedUnit && formData.litros > selectedUnit.capacidadTanque;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Fuel className="h-4 w-4 text-primary" />
            </div>
            Agregar Ticket de Combustible
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
              <SelectContent>
                {unidadesCombustible.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="text-sm">
                    {unit.numero} (Tanque: {unit.capacidadTanque}L)
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
              <SelectContent>
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
              placeholder="Ej: OXXO Gas - Querétaro Norte"
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
                className={`h-11 text-sm ${isOverCapacity ? 'border-status-danger focus-visible:ring-status-danger' : ''}`}
              />
              {isOverCapacity && (
                <p className="text-xs text-status-danger">
                  ⚠️ Excede capacidad del tanque ({selectedUnit?.capacidadTanque}L)
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
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Calculado:</span>
              <span className="text-xl font-bold text-primary">
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
              className="h-11 text-sm flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Upload className="h-4 w-4" />
              Registrar Carga
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
