import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { defaultTiposUnidad, TipoUnidad } from '@/data/tiposUnidadData';
import { toast } from 'sonner';

export function TiposUnidadConfig() {
  const [tipos, setTipos] = useState<TipoUnidad[]>(defaultTiposUnidad);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoUnidad | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    icono: '🚛',
  });

  const handleOpenNew = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '', icono: '🚛' });
    setIsModalOpen(true);
  };

  const handleEdit = (tipo: TipoUnidad) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      icono: tipo.icono,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (editingTipo) {
      setTipos(prev => prev.map(t => 
        t.id === editingTipo.id 
          ? { ...t, ...formData }
          : t
      ));
      toast.success('Tipo de unidad actualizado');
    } else {
      const newTipo: TipoUnidad = {
        id: `tipo-${Date.now()}`,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        icono: formData.icono,
        activo: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTipos(prev => [...prev, newTipo]);
      toast.success('Tipo de unidad agregado');
    }
    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    setTipos(prev => prev.map(t => 
      t.id === id ? { ...t, activo: !t.activo } : t
    ));
    const tipo = tipos.find(t => t.id === id);
    toast.success(`${tipo?.nombre} ${tipo?.activo ? 'desactivado' : 'activado'}`);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const tipo = tipos.find(t => t.id === deleteId);
    setTipos(prev => prev.filter(t => t.id !== deleteId));
    toast.success(`${tipo?.nombre} eliminado`);
    setDeleteId(null);
  };

  const emojis = ['🚛', '🚚', '📦', '❄️', '🛻', '🏗️', '🏭', '🚗', '🚐', '🚌', '🏎️', '🚜'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Tipos de Unidad
            </CardTitle>
            <CardDescription>
              Configura los tipos de vehículos disponibles en el sistema
            </CardDescription>
          </div>
          <Button onClick={handleOpenNew} size="sm" className="gap-2 bg-action hover:bg-action-hover text-action-foreground">
            <Plus className="h-4 w-4" />
            Agregar Tipo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tipos.map((tipo) => (
            <div
              key={tipo.id}
              className={`p-4 border rounded-lg transition-all ${
                tipo.activo 
                  ? 'bg-card hover:shadow-md' 
                  : 'bg-muted/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tipo.icono}</span>
                  <div>
                    <h4 className="font-semibold text-foreground">{tipo.nombre}</h4>
                    <p className="text-xs text-muted-foreground">{tipo.descripcion}</p>
                  </div>
                </div>
                <Badge variant={tipo.activo ? "default" : "secondary"} className="text-[10px]">
                  {tipo.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <Switch
                  checked={tipo.activo}
                  onCheckedChange={() => handleToggleActive(tipo.id)}
                />
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleEdit(tipo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(tipo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Unidad' : 'Nuevo Tipo de Unidad'}
            </DialogTitle>
            <DialogDescription>
              Define un nuevo tipo de vehículo para el catálogo de flota
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Refrigerado, Cama Baja..."
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción breve del tipo de unidad"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icono: emoji })}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                      formData.icono === emoji 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-action hover:bg-action-hover text-action-foreground">
              {editingTipo ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de unidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las unidades existentes de este tipo
              mantendrán su clasificación actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Hook para obtener tipos de unidad activos (para usar en otros componentes)
export function useTiposUnidad() {
  const [tipos] = useState<TipoUnidad[]>(defaultTiposUnidad);
  
  const tiposActivos = tipos.filter(t => t.activo);
  
  const getTipoLabel = (id: string) => {
    const tipo = tipos.find(t => t.id === id || t.nombre.toLowerCase() === id.toLowerCase());
    return tipo ? `${tipo.icono} ${tipo.nombre}` : id;
  };
  
  const getTipoBadge = (nombreTipo: string) => {
    const tipo = tipos.find(t => t.nombre.toLowerCase() === nombreTipo.toLowerCase());
    if (!tipo) return { icono: '📦', nombre: nombreTipo };
    return { icono: tipo.icono, nombre: tipo.nombre };
  };
  
  return { tipos, tiposActivos, getTipoLabel, getTipoBadge };
}
