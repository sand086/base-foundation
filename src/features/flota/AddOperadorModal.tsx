import { useState } from 'react';
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
import { User, Phone, CreditCard, Calendar, Truck, Heart } from 'lucide-react';
import { unidadesDisponibles } from '@/data/flotaData';

interface AddOperadorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddOperadorModal({ open, onOpenChange }: AddOperadorModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    license_type: '',
    license_expiry: '',
    medical_check_expiry: '',
    phone: '',
    assigned_unit: '',
    hire_date: '',
    emergency_contact: '',
    emergency_phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    toast({
      title: 'Operador registrado',
      description: `${formData.name} ha sido agregado exitosamente.`,
    });

    setIsLoading(false);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: '',
      license_number: '',
      license_type: '',
      license_expiry: '',
      medical_check_expiry: '',
      phone: '',
      assigned_unit: '',
      hire_date: '',
      emergency_contact: '',
      emergency_phone: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Registrar Nuevo Operador
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            Complete la información del conductor para agregarlo al sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Información Personal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez González"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+52 55 1234 5678"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Fecha de Contratación *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hire_date"
                  type="date"
                  className="pl-10"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* License Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Información de Licencia
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">Número de Licencia *</Label>
                <Input
                  id="license_number"
                  placeholder="LIC-2024-12345"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_type">Tipo de Licencia *</Label>
                <Select
                  value={formData.license_type}
                  onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Tipo A - Motocicleta</SelectItem>
                    <SelectItem value="B">Tipo B - Automóvil</SelectItem>
                    <SelectItem value="C">Tipo C - Carga ligera</SelectItem>
                    <SelectItem value="D">Tipo D - Carga pesada</SelectItem>
                    <SelectItem value="E">Tipo E - Tractocamión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_expiry">Vigencia de Licencia *</Label>
                <Input
                  id="license_expiry"
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_check_expiry">Vigencia Examen Médico *</Label>
                <Input
                  id="medical_check_expiry"
                  type="date"
                  value={formData.medical_check_expiry}
                  onChange={(e) => setFormData({ ...formData, medical_check_expiry: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Asignación de Unidad (Opcional)
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="assigned_unit">Unidad Asignada</Label>
              <Select
                value={formData.assigned_unit}
                onValueChange={(value) => setFormData({ ...formData, assigned_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {unidadesDisponibles.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Contacto de Emergencia
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Nombre del Contacto</Label>
                <Input
                  id="emergency_contact"
                  placeholder="María González"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_phone">Teléfono de Emergencia</Label>
                <Input
                  id="emergency_phone"
                  placeholder="+52 55 8765 4321"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                'Guardar Operador'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
