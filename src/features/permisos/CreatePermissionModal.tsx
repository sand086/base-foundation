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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { modulos } from '@/data/usuariosData';

interface CreatePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { key: string; descripcion: string; modulo: string; accion: string }) => void;
}

const acciones = [
  { id: 'crear', nombre: 'Crear', descripcion: 'Permite crear nuevos registros' },
  { id: 'leer', nombre: 'Leer', descripcion: 'Permite ver/consultar información' },
  { id: 'actualizar', nombre: 'Actualizar', descripcion: 'Permite modificar registros existentes' },
  { id: 'eliminar', nombre: 'Eliminar', descripcion: 'Permite borrar registros' },
  { id: 'exportar', nombre: 'Exportar', descripcion: 'Permite descargar/exportar datos' },
  { id: 'aprobar', nombre: 'Aprobar', descripcion: 'Permite aprobar solicitudes o procesos' },
  { id: 'otro', nombre: 'Otro (Especificar)', descripcion: 'Acción personalizada' },
];

export function CreatePermissionModal({
  open,
  onOpenChange,
  onSubmit,
}: CreatePermissionModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState('');
  const [selectedAccion, setSelectedAccion] = useState('');
  const [customAccion, setCustomAccion] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  // Generate key automatically from selections
  const generateKey = (modulo: string, accion: string, custom?: string) => {
    if (!modulo) return '';
    
    const moduloKey = modulo.toLowerCase().replace(/\s+/g, '_');
    
    if (accion === 'otro' && custom) {
      const customKey = custom.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return `${moduloKey}_${customKey}`;
    }
    
    if (accion) {
      return `${moduloKey}_${accion}`;
    }
    
    return moduloKey;
  };

  const handleModuloChange = (value: string) => {
    setSelectedModulo(value);
    setGeneratedKey(generateKey(value, selectedAccion, customAccion));
  };

  const handleAccionChange = (value: string) => {
    setSelectedAccion(value);
    if (value !== 'otro') {
      setCustomAccion('');
    }
    setGeneratedKey(generateKey(selectedModulo, value, customAccion));
  };

  const handleCustomAccionChange = (value: string) => {
    setCustomAccion(value);
    setGeneratedKey(generateKey(selectedModulo, selectedAccion, value));
  };

  const getDescripcion = () => {
    const moduloNombre = modulos.find(m => m.id === selectedModulo)?.nombre || '';
    const accionNombre = acciones.find(a => a.id === selectedAccion)?.nombre || '';
    
    if (selectedAccion === 'otro' && customAccion) {
      return `Permite ${customAccion.toLowerCase()} en ${moduloNombre}`;
    }
    
    if (moduloNombre && accionNombre) {
      return `Permite ${accionNombre.toLowerCase()} en ${moduloNombre}`;
    }
    
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedModulo || !selectedAccion) {
      toast.error('Campos requeridos', {
        description: 'Selecciona un módulo y una acción.',
      });
      return;
    }

    if (selectedAccion === 'otro' && !customAccion.trim()) {
      toast.error('Acción requerida', {
        description: 'Especifica la acción personalizada.',
      });
      return;
    }
    
    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const descripcion = getDescripcion();
    const accionFinal = selectedAccion === 'otro' ? customAccion : selectedAccion;
    
    onSubmit({
      key: generatedKey,
      descripcion,
      modulo: selectedModulo,
      accion: accionFinal,
    });
    
    setIsSaving(false);
    toast.success('Permiso creado', {
      description: `El permiso "${generatedKey}" ha sido agregado.`,
    });
    
    // Reset form
    setSelectedModulo('');
    setSelectedAccion('');
    setCustomAccion('');
    setGeneratedKey('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedModulo('');
    setSelectedAccion('');
    setCustomAccion('');
    setGeneratedKey('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            Crear Nuevo Permiso
          </DialogTitle>
          <DialogDescription className="text-sm">
            Selecciona el módulo y la acción para generar automáticamente el permiso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Module Select */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Módulo
            </Label>
            <Select value={selectedModulo} onValueChange={handleModuloChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecciona un módulo..." />
              </SelectTrigger>
              <SelectContent>
                {modulos.map((modulo) => (
                  <SelectItem key={modulo.id} value={modulo.id}>
                    {modulo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Select */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Acción
            </Label>
            <Select value={selectedAccion} onValueChange={handleAccionChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecciona una acción..." />
              </SelectTrigger>
              <SelectContent>
                {acciones.map((accion) => (
                  <SelectItem key={accion.id} value={accion.id}>
                    <div className="flex flex-col">
                      <span>{accion.nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Action Input (only if "Otro" is selected) */}
          {selectedAccion === 'otro' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Especificar Acción
              </Label>
              <Input
                value={customAccion}
                onChange={(e) => handleCustomAccionChange(e.target.value)}
                placeholder="Ej: Aprobar solicitudes, Generar reportes..."
                className="h-10"
              />
            </div>
          )}

          {/* Generated Key Preview */}
          {generatedKey && (
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Permiso Generado</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Key:</span>
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                    {generatedKey}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-16">Desc:</span>
                  <span className="text-sm text-foreground">
                    {getDescripcion()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              El permiso se agregará automáticamente a la matriz y podrá asignarse a cualquier rol del sistema.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !generatedKey}
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
