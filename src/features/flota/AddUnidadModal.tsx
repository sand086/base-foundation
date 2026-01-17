import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { useTiposUnidad } from '@/hooks/useTiposUnidad';
import { Truck, CreditCard, Calendar, Hash } from 'lucide-react';

export interface Unidad {
  id: string;
  numeroEconomico: string;
  placas: string;
  marca: string;
  modelo: string;
  year: number;
  tipo: 'sencillo' | 'full' | 'rabon';
  status: 'disponible' | 'en_ruta' | 'mantenimiento' | 'bloqueado';
  operador: string | null;
  documentosVencidos: number;
  llantasCriticas: number;
}

interface AddUnidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadToEdit?: Unidad | null;
  onSave?: (unidad: Omit<Unidad, 'id'> & { id?: string }) => void;
}

const emptyFormData = {
  numeroEconomico: '',
  placas: '',
  marca: '',
  modelo: '',
  year: new Date().getFullYear().toString(),
  tipo: '',
};

export function AddUnidadModal({ 
  open, 
  onOpenChange, 
  unidadToEdit,
  onSave 
}: AddUnidadModalProps) {
  const { toast } = useToast();
  const { tiposActivos, loading: loadingTipos } = useTiposUnidad();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!unidadToEdit;

  // Pre-load data when editing
  useEffect(() => {
    if (unidadToEdit) {
      setFormData({
        numeroEconomico: unidadToEdit.numeroEconomico,
        placas: unidadToEdit.placas,
        marca: unidadToEdit.marca,
        modelo: unidadToEdit.modelo,
        year: unidadToEdit.year.toString(),
        tipo: unidadToEdit.tipo,
      });
      setErrors({});
    } else {
      setFormData(emptyFormData);
      setErrors({});
    }
  }, [unidadToEdit, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numeroEconomico.trim()) {
      newErrors.numeroEconomico = 'El número económico es obligatorio';
    }
    if (!formData.placas.trim()) {
      newErrors.placas = 'Las placas son obligatorias';
    }
    if (!formData.marca.trim()) {
      newErrors.marca = 'La marca es obligatoria';
    }
    if (!formData.modelo.trim()) {
      newErrors.modelo = 'El modelo es obligatorio';
    }
    if (!formData.year || isNaN(Number(formData.year))) {
      newErrors.year = 'El año es obligatorio';
    }
    if (!formData.tipo) {
      newErrors.tipo = 'Seleccione un tipo de unidad';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Faltan datos',
        description: 'Por favor complete todos los campos obligatorios.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const unidadData = {
      ...(isEditMode && unidadToEdit ? { id: unidadToEdit.id } : {}),
      numeroEconomico: formData.numeroEconomico,
      placas: formData.placas.toUpperCase(),
      marca: formData.marca,
      modelo: formData.modelo,
      year: Number(formData.year),
      tipo: formData.tipo as Unidad['tipo'],
      status: unidadToEdit?.status || 'disponible' as const,
      operador: unidadToEdit?.operador || null,
      documentosVencidos: unidadToEdit?.documentosVencidos || 0,
      llantasCriticas: unidadToEdit?.llantasCriticas || 0,
    };

    onSave?.(unidadData);

    toast({
      title: isEditMode ? 'Unidad actualizada' : 'Unidad registrada',
      description: `${formData.numeroEconomico} ha sido ${isEditMode ? 'actualizada' : 'agregada'} exitosamente.`,
    });

    setIsLoading(false);
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(emptyFormData);
    setErrors({});
  };

  // Generate year options (last 15 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            {isEditMode ? 'Editar Unidad' : 'Registrar Nueva Unidad'}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            {isEditMode 
              ? 'Modifique la información de la unidad.' 
              : 'Complete la información del vehículo para agregarlo a la flota.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Identification */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Identificación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroEconomico">No. Económico *</Label>
                <Input
                  id="numeroEconomico"
                  placeholder="TR-001"
                  value={formData.numeroEconomico}
                  onChange={(e) => setFormData({ ...formData, numeroEconomico: e.target.value.toUpperCase() })}
                  className={errors.numeroEconomico ? 'border-destructive' : ''}
                />
                {errors.numeroEconomico && <p className="text-xs text-destructive">{errors.numeroEconomico}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="placas">Placas Federales *</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="placas"
                    placeholder="AAA-000-A"
                    className={`pl-10 uppercase ${errors.placas ? 'border-destructive' : ''}`}
                    value={formData.placas}
                    onChange={(e) => setFormData({ ...formData, placas: e.target.value.toUpperCase() })}
                  />
                </div>
                {errors.placas && <p className="text-xs text-destructive">{errors.placas}</p>}
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Datos del Vehículo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca *</Label>
                <Select
                  value={formData.marca}
                  onValueChange={(value) => setFormData({ ...formData, marca: value })}
                >
                  <SelectTrigger className={errors.marca ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Freightliner">Freightliner</SelectItem>
                    <SelectItem value="Kenworth">Kenworth</SelectItem>
                    <SelectItem value="Volvo">Volvo</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="Peterbilt">Peterbilt</SelectItem>
                    <SelectItem value="Mack">Mack</SelectItem>
                    <SelectItem value="Western Star">Western Star</SelectItem>
                  </SelectContent>
                </Select>
                {errors.marca && <p className="text-xs text-destructive">{errors.marca}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo *</Label>
                <Input
                  id="modelo"
                  placeholder="Cascadia, T680, VNL..."
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className={errors.modelo ? 'border-destructive' : ''}
                />
                {errors.modelo && <p className="text-xs text-destructive">{errors.modelo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Año *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                  >
                    <SelectTrigger className={`pl-10 ${errors.year ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Seleccionar año" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Unidad *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  disabled={loadingTipos}
                >
                  <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loadingTipos ? 'Cargando...' : 'Seleccionar tipo'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposActivos.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.nombre.toLowerCase()}>
                        <span className="flex items-center gap-2">
                          {tipo.icono} {tipo.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-xs text-destructive">{errors.tipo}</p>}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-action hover:bg-action-hover text-action-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                isEditMode ? 'Actualizar Unidad' : 'Guardar Unidad'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
