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
import { Edit, Loader2, Fuel, Droplets, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { type CargaCombustible, type TipoCombustible, unidadesCombustible, operadoresCombustible } from '@/data/combustibleData';

interface EditCargaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: CargaCombustible | null;
  onSave: (carga: CargaCombustible) => void;
}

export function EditCargaModal({ open, onOpenChange, carga, onSave }: EditCargaModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    unidadId: '',
    operadorId: '',
    tipoCombustible: 'diesel' as TipoCombustible,
    litros: 0,
    precioPorLitro: 0,
    odometro: 0,
    estacion: '',
    fechaHora: '',
  });

  useEffect(() => {
    if (carga && open) {
      setFormData({
        unidadId: carga.unidadId,
        operadorId: carga.operadorId,
        tipoCombustible: carga.tipoCombustible,
        litros: carga.litros,
        precioPorLitro: carga.precioPorLitro,
        odometro: carga.odometro,
        estacion: carga.estacion,
        fechaHora: carga.fechaHora.replace(' ', 'T'),
      });
    }
  }, [carga, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carga) return;

    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const unit = unidadesCombustible.find(u => u.id === formData.unidadId);
    const operator = operadoresCombustible.find(o => o.id === formData.operadorId);
    
    if (!unit || !operator) {
      toast.error('Error', { description: 'Unidad u operador no válidos.' });
      setIsSaving(false);
      return;
    }

    const tankCapacity = formData.tipoCombustible === 'diesel' 
      ? unit.capacidadTanqueDiesel 
      : unit.capacidadTanqueUrea;

    const updatedCarga: CargaCombustible = {
      ...carga,
      unidadId: formData.unidadId,
      unidadNumero: unit.numero,
      operadorId: formData.operadorId,
      operadorNombre: operator.nombre,
      tipoCombustible: formData.tipoCombustible,
      litros: formData.litros,
      precioPorLitro: formData.precioPorLitro,
      total: formData.litros * formData.precioPorLitro,
      odometro: formData.odometro,
      estacion: formData.estacion,
      fechaHora: formData.fechaHora.replace('T', ' '),
      capacidadTanque: tankCapacity,
      excedeTanque: formData.litros > tankCapacity,
    };

    onSave(updatedCarga);
    
    setIsSaving(false);
    toast.success('Ticket actualizado', {
      description: `Los datos del ticket ${carga.id} han sido guardados.`,
    });
    onOpenChange(false);
  };

  if (!carga) return null;

  const total = formData.litros * formData.precioPorLitro;
  const selectedUnit = unidadesCombustible.find(u => u.id === formData.unidadId);
  const tankCapacity = selectedUnit 
    ? (formData.tipoCombustible === 'diesel' ? selectedUnit.capacidadTanqueDiesel : selectedUnit.capacidadTanqueUrea)
    : 0;
  const exceedsTank = formData.litros > tankCapacity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Edit className="h-4 w-4 text-primary" />
            </div>
            Editar Ticket de Combustible
            <span className="text-sm font-mono text-muted-foreground ml-2">
              {carga.id}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Fecha/Hora y Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fecha y Hora
              </Label>
              <Input
                type="datetime-local"
                value={formData.fechaHora}
                onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de Combustible
              </Label>
              <Select
                value={formData.tipoCombustible}
                onValueChange={(value: TipoCombustible) => setFormData({ ...formData, tipoCombustible: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-3.5 w-3.5 text-amber-600" />
                      Diesel
                    </div>
                  </SelectItem>
                  <SelectItem value="urea">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-sky-600" />
                      Urea/DEF
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unidad y Operador */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Unidad
              </Label>
              <Select
                value={formData.unidadId}
                onValueChange={(value) => setFormData({ ...formData, unidadId: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {unidadesCombustible.map((unidad) => (
                    <SelectItem key={unidad.id} value={unidad.id}>
                      {unidad.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Operador
              </Label>
              <Select
                value={formData.operadorId}
                onValueChange={(value) => setFormData({ ...formData, operadorId: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {operadoresCombustible.map((operador) => (
                    <SelectItem key={operador.id} value={operador.id}>
                      {operador.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estación */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estación de Servicio
            </Label>
            <Input
              value={formData.estacion}
              onChange={(e) => setFormData({ ...formData, estacion: e.target.value })}
              placeholder="Nombre de la estación..."
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Litros, Precio, Odómetro */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Litros
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.litros}
                onChange={(e) => setFormData({ ...formData, litros: parseFloat(e.target.value) || 0 })}
                required
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Precio/Litro
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.precioPorLitro}
                onChange={(e) => setFormData({ ...formData, precioPorLitro: parseFloat(e.target.value) || 0 })}
                required
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Odómetro
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.odometro}
                onChange={(e) => setFormData({ ...formData, odometro: parseInt(e.target.value) || 0 })}
                required
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Alert if exceeds tank capacity */}
          {exceedsTank && (
            <div className="flex items-center gap-2 p-3 bg-status-warning-bg rounded-lg border border-status-warning-border">
              <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0" />
              <p className="text-xs text-status-warning">
                Los litros ({formData.litros}L) exceden la capacidad del tanque ({tankCapacity}L).
              </p>
            </div>
          )}

          {/* Total Preview */}
          <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-lg font-bold">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
