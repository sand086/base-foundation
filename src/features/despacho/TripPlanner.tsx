import { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  ArrowRight, 
  Clock, 
  FileText,
  Trash2,
  Rocket,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { mockDispatchClientes } from '@/data/despachoData';

interface ServiceRequest {
  id: string;
  clienteId: string;
  clienteNombre: string;
  origen: string;
  destino: string;
  fechaAproximada: string;
  notas?: string;
  estatus: 'borrador' | 'pendiente' | 'convertido';
  fechaCreacion: string;
}

const mockServiceRequests: ServiceRequest[] = [
  {
    id: 'REQ-001',
    clienteId: 'cliente-1',
    clienteNombre: 'Sabino del Bene',
    origen: 'CDMX',
    destino: 'Veracruz Puerto',
    fechaAproximada: '2025-01-20',
    notas: 'Carga urgente - Contenedor 40ft',
    estatus: 'borrador',
    fechaCreacion: '2025-01-15',
  },
  {
    id: 'REQ-002',
    clienteId: 'cliente-2',
    clienteNombre: 'DHL Supply Chain',
    origen: 'Querétaro',
    destino: 'CDMX',
    fechaAproximada: '2025-01-22',
    notas: 'Pendiente confirmación de horario',
    estatus: 'pendiente',
    fechaCreacion: '2025-01-14',
  },
];

export const TripPlanner = () => {
  const { rutasActivas } = useRutasAutorizadas();
  const [requests, setRequests] = useState<ServiceRequest[]>(mockServiceRequests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  
  const [formData, setFormData] = useState({
    clienteId: '',
    rutaId: '',
    fechaAproximada: '',
    notas: '',
  });

  const handleOpenNewDialog = () => {
    setFormData({
      clienteId: '',
      rutaId: '',
      fechaAproximada: '',
      notas: '',
    });
    setDialogOpen(true);
  };

  const handleSaveRequest = () => {
    if (!formData.clienteId || !formData.rutaId || !formData.fechaAproximada) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const cliente = mockDispatchClientes.find(c => c.id === formData.clienteId);
    const ruta = rutasActivas.find(r => r.id === formData.rutaId);

    if (!cliente || !ruta) {
      toast.error('Selección inválida');
      return;
    }

    const newRequest: ServiceRequest = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      clienteId: formData.clienteId,
      clienteNombre: cliente.nombre,
      origen: ruta.origen,
      destino: ruta.destino,
      fechaAproximada: formData.fechaAproximada,
      notas: formData.notas || undefined,
      estatus: 'borrador',
      fechaCreacion: new Date().toISOString().split('T')[0],
    };

    setRequests([...requests, newRequest]);
    setDialogOpen(false);
    toast.success('Solicitud de servicio creada como borrador');
  };

  const handleDeleteRequest = () => {
    if (selectedRequest) {
      setRequests(requests.filter(r => r.id !== selectedRequest.id));
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
      toast.success('Solicitud eliminada');
    }
  };

  const handleConvertToTrip = () => {
    if (selectedRequest) {
      setRequests(requests.map(r => 
        r.id === selectedRequest.id ? { ...r, estatus: 'convertido' as const } : r
      ));
      setConvertDialogOpen(false);
      toast.success('Solicitud convertida a viaje real. Puedes continuar en el Wizard de Despacho.');
      setSelectedRequest(null);
    }
  };

  const getStatusBadge = (estatus: string) => {
    switch (estatus) {
      case 'borrador':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendiente DODA</Badge>;
      case 'convertido':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Convertido</Badge>;
      default:
        return null;
    }
  };

  const activeDrafts = requests.filter(r => r.estatus !== 'convertido');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Planeador de Viajes (Pre-Despacho)
              </CardTitle>
              <CardDescription>
                Crea solicitudes de servicio antes de tener la Carta Porte. Convierte a viaje real cuando tengas la DODA.
              </CardDescription>
            </div>
            <Button onClick={handleOpenNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Solicitud
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-200">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.estatus === 'borrador').length}
                </p>
                <p className="text-sm text-muted-foreground">Borradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-200">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">
                  {requests.filter(r => r.estatus === 'pendiente').length}
                </p>
                <p className="text-sm text-amber-700">Pendientes DODA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-200">
                <Rocket className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">
                  {requests.filter(r => r.estatus === 'convertido').length}
                </p>
                <p className="text-sm text-emerald-700">Convertidos a Viaje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeDrafts.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="font-mono font-bold">{request.id}</p>
                  </div>
                  
                  <div className="h-10 w-px bg-border" />
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.clienteNombre}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{request.origen}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{request.destino}</span>
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-border" />
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.fechaAproximada}</span>
                    </div>
                    {request.notas && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                        {request.notas}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(request.estatus)}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setSelectedRequest(request);
                      setConvertDialogOpen(true);
                    }}
                  >
                    <Rocket className="h-4 w-4" />
                    Convertir a Viaje
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedRequest(request);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {activeDrafts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay solicitudes activas</p>
                <p className="text-sm">Crea una nueva solicitud para apartar viajes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Servicio</DialogTitle>
            <DialogDescription>
              Crea un borrador para apartar un viaje antes de tener la Carta Porte (DODA).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select 
                value={formData.clienteId} 
                onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {mockDispatchClientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Ruta *</Label>
              <Select 
                value={formData.rutaId} 
                onValueChange={(v) => setFormData({ ...formData, rutaId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ruta..." />
                </SelectTrigger>
                <SelectContent>
                  {rutasActivas.map((ruta) => (
                    <SelectItem key={ruta.id} value={ruta.id}>
                      <div className="flex items-center gap-2">
                        <span>{ruta.origen}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{ruta.destino}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fecha Aproximada *</Label>
              <Input
                type="date"
                value={formData.fechaAproximada}
                onChange={(e) => setFormData({ ...formData, fechaAproximada: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Observaciones, tipo de carga, horarios especiales..."
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRequest}>
              Crear Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la solicitud {selectedRequest?.id}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir a Viaje Real</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la solicitud {selectedRequest?.id} como convertida. 
              Podrás continuar el proceso completo en la pestaña "Nuevo Viaje" del wizard de despacho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToTrip}>
              Convertir a Viaje
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
