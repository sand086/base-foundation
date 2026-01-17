import { useState } from 'react';
import { Plus, Edit2, Trash2, Route, ArrowRight, MapPin, Clock, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from 'sonner';
import { useRutasAutorizadas } from '@/hooks/useRutasAutorizadas';
import { RutaAutorizada } from '@/data/rutasData';

export const RutasAutorizadasConfig = () => {
  const { rutas, addRuta, updateRuta, deleteRuta, toggleRutaActivo } = useRutasAutorizadas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rutaToDelete, setRutaToDelete] = useState<string | null>(null);
  const [editingRuta, setEditingRuta] = useState<RutaAutorizada | null>(null);
  
  const [formData, setFormData] = useState({
    origen: '',
    destino: '',
    descripcion: '',
    distanciaKm: '',
    tiempoEstimadoHoras: '',
  });

  const handleOpenDialog = (ruta?: RutaAutorizada) => {
    if (ruta) {
      setEditingRuta(ruta);
      setFormData({
        origen: ruta.origen,
        destino: ruta.destino,
        descripcion: ruta.descripcion || '',
        distanciaKm: ruta.distanciaKm?.toString() || '',
        tiempoEstimadoHoras: ruta.tiempoEstimadoHoras?.toString() || '',
      });
    } else {
      setEditingRuta(null);
      setFormData({
        origen: '',
        destino: '',
        descripcion: '',
        distanciaKm: '',
        tiempoEstimadoHoras: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.origen.trim() || !formData.destino.trim()) {
      toast.error('Origen y Destino son obligatorios');
      return;
    }

    const rutaData = {
      origen: formData.origen.trim(),
      destino: formData.destino.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      distanciaKm: formData.distanciaKm ? parseInt(formData.distanciaKm) : undefined,
      tiempoEstimadoHoras: formData.tiempoEstimadoHoras ? parseInt(formData.tiempoEstimadoHoras) : undefined,
      activo: true,
    };

    if (editingRuta) {
      updateRuta(editingRuta.id, rutaData);
      toast.success('Ruta actualizada correctamente');
    } else {
      addRuta(rutaData);
      toast.success('Nueva ruta agregada al catálogo');
    }

    setDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (rutaToDelete) {
      deleteRuta(rutaToDelete);
      toast.success('Ruta eliminada del catálogo');
      setDeleteDialogOpen(false);
      setRutaToDelete(null);
    }
  };

  const handleToggleActivo = (id: string, currentState: boolean) => {
    toggleRutaActivo(id);
    toast.success(currentState ? 'Ruta desactivada' : 'Ruta activada');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Rutas Autorizadas
            </CardTitle>
            <CardDescription>
              Catálogo de rutas disponibles para tarifas y despachos
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Ruta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rutas.map((ruta) => (
            <div
              key={ruta.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                ruta.activo 
                  ? 'bg-card border-border hover:bg-muted/50' 
                  : 'bg-muted/30 border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{ruta.origen}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{ruta.destino}</span>
                  </div>
                  {ruta.descripcion && (
                    <p className="text-sm text-muted-foreground">{ruta.descripcion}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    {ruta.distanciaKm && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        {ruta.distanciaKm} km
                      </span>
                    )}
                    {ruta.tiempoEstimadoHoras && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{ruta.tiempoEstimadoHoras} hrs
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant={ruta.activo ? 'default' : 'secondary'}>
                  {ruta.activo ? 'Activa' : 'Inactiva'}
                </Badge>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ruta.activo}
                    onCheckedChange={() => handleToggleActivo(ruta.id, ruta.activo)}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(ruta)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setRutaToDelete(ruta.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {rutas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay rutas registradas</p>
              <p className="text-sm">Agrega la primera ruta al catálogo</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRuta ? 'Editar Ruta' : 'Nueva Ruta Autorizada'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origen">Origen *</Label>
                <Input
                  id="origen"
                  placeholder="Ej: CDMX"
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destino">Destino *</Label>
                <Input
                  id="destino"
                  placeholder="Ej: Veracruz Puerto"
                  value={formData.destino}
                  onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Input
                id="descripcion"
                placeholder="Descripción de la ruta"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distanciaKm">Distancia (km)</Label>
                <Input
                  id="distanciaKm"
                  type="number"
                  placeholder="Ej: 420"
                  value={formData.distanciaKm}
                  onChange={(e) => setFormData({ ...formData, distanciaKm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiempoEstimadoHoras">Tiempo estimado (hrs)</Label>
                <Input
                  id="tiempoEstimadoHoras"
                  type="number"
                  placeholder="Ej: 6"
                  value={formData.tiempoEstimadoHoras}
                  onChange={(e) => setFormData({ ...formData, tiempoEstimadoHoras: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingRuta ? 'Guardar Cambios' : 'Agregar Ruta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ruta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la ruta del catálogo. Las tarifas existentes que usen esta ruta no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
