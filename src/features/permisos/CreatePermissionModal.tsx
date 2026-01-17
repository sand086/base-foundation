import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { key: string; descripcion: string }) => void;
}

export function CreatePermissionModal({
  open,
  onOpenChange,
  onSubmit,
}: CreatePermissionModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    descripcion: '',
  });
  const [errors, setErrors] = useState<{ key?: string; descripcion?: string }>({});

  const validateKey = (key: string) => {
    // Key format: lowercase, underscores, no spaces
    return /^[a-z][a-z0-9_]*$/.test(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { key?: string; descripcion?: string } = {};
    
    if (!formData.key.trim()) {
      newErrors.key = 'El key es requerido';
    } else if (!validateKey(formData.key)) {
      newErrors.key = 'Usa solo letras minúsculas, números y guiones bajos. Debe iniciar con letra.';
    }
    
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    onSubmit(formData);
    
    setIsSaving(false);
    toast.success('Permiso creado', {
      description: `El permiso "${formData.key}" ha sido agregado.`,
    });
    
    // Reset form
    setFormData({ key: '', descripcion: '' });
    setErrors({});
    onOpenChange(false);
  };

  const handleKeyChange = (value: string) => {
    // Auto-format to snake_case
    const formatted = value
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    setFormData({ ...formData, key: formatted });
    if (errors.key) setErrors({ ...errors, key: undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            Crear Nuevo Permiso
          </DialogTitle>
          <DialogDescription className="text-sm">
            Define un nuevo permiso que podrás asignar a los roles del sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="key" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Key del Permiso
            </Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="ver_dashboard"
              className={`h-9 text-sm font-mono ${errors.key ? 'border-destructive' : ''}`}
            />
            {errors.key ? (
              <p className="text-xs text-destructive">{errors.key}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ej: ver_reportes, editar_clientes, eliminar_viajes
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Descripción
            </Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => {
                setFormData({ ...formData, descripcion: e.target.value });
                if (errors.descripcion) setErrors({ ...errors, descripcion: undefined });
              }}
              placeholder="Permite al usuario ver el dashboard principal..."
              className={`min-h-[80px] text-sm ${errors.descripcion ? 'border-destructive' : ''}`}
            />
            {errors.descripcion && (
              <p className="text-xs text-destructive">{errors.descripcion}</p>
            )}
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> Una vez creado, el permiso aparecerá en la matriz de permisos
              y podrá ser asignado a cualquier rol.
            </p>
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
                  Creando...
                </>
              ) : (
                'Crear Permiso'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
