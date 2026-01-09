import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  Settings, 
  Mail, 
  MessageSquare, 
  Upload, 
  Building2,
  AlertTriangle,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { 
  mockNotificaciones, 
  defaultConfigAlertas, 
  defaultPlantillasCorreo,
  type ConfiguracionAlertas,
  type PlantillaCorreo
} from '@/data/notificacionesData';
import { toast } from '@/hooks/use-toast';

const NotificacionesConfig = () => {
  const [notificaciones] = useState(mockNotificaciones);
  const [configAlertas, setConfigAlertas] = useState<ConfiguracionAlertas>(defaultConfigAlertas);
  const [plantillas, setPlantillas] = useState<PlantillaCorreo[]>(defaultPlantillasCorreo);
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaCorreo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  const filteredNotificaciones = notificaciones.filter(notif => {
    const matchesSearch = notif.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          notif.asunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === 'todos' || notif.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return (
          <Badge className="bg-status-success-bg text-status-success border-status-success-border">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-status-danger-bg text-status-danger border-status-danger-border">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'pendiente':
        return (
          <Badge className="bg-status-warning-bg text-status-warning border-status-warning-border">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string, label: string) => {
    switch (tipo) {
      case 'estatus_viaje':
        return (
          <Badge variant="outline" className="border-primary text-primary">
            <Truck className="w-3 h-3 mr-1" />
            {label}
          </Badge>
        );
      case 'factura':
        return (
          <Badge variant="outline" className="border-status-info text-status-info">
            <FileText className="w-3 h-3 mr-1" />
            {label}
          </Badge>
        );
      case 'alerta':
        return (
          <Badge variant="outline" className="border-status-warning text-status-warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {label}
          </Badge>
        );
      case 'recordatorio':
        return (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            <Bell className="w-3 h-3 mr-1" />
            {label}
          </Badge>
        );
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  const getCanalIcon = (canal: string) => {
    return canal === 'email' ? (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Mail className="w-4 h-4" />
        <span>Email</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        <span>SMS</span>
      </div>
    );
  };

  const handleSaveConfig = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios en las alertas han sido guardados correctamente.",
    });
  };

  const handleSavePlantilla = () => {
    if (selectedPlantilla) {
      setPlantillas(prev => 
        prev.map(p => p.id === selectedPlantilla.id ? selectedPlantilla : p)
      );
      toast({
        title: "Plantilla actualizada",
        description: `La plantilla "${selectedPlantilla.nombre}" ha sido guardada.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notificaciones y Configuración" 
        description="Historial de notificaciones y configuración del sistema"
      />

      <Tabs defaultValue="historial" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="historial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="alertas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="correos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Mail className="w-4 h-4 mr-2" />
            Correos
          </TabsTrigger>
        </TabsList>

        {/* Historial de Notificaciones */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Historial de Notificaciones</CardTitle>
                  <CardDescription>Registro de todos los correos y SMS enviados por el sistema</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por destinatario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="estatus_viaje">Estatus Viaje</SelectItem>
                      <SelectItem value="factura">Factura</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                      <SelectItem value="recordatorio">Recordatorio</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Fecha/Hora</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Destinatario</TableHead>
                      <TableHead className="font-semibold">Asunto</TableHead>
                      <TableHead className="font-semibold">Canal</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotificaciones.map((notif) => (
                      <TableRow key={notif.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{notif.fechaHora}</TableCell>
                        <TableCell>{getTipoBadge(notif.tipo, notif.tipoLabel)}</TableCell>
                        <TableCell className="font-medium">{notif.destinatario}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {notif.asunto}
                        </TableCell>
                        <TableCell>{getCanalIcon(notif.canal)}</TableCell>
                        <TableCell>{getEstadoBadge(notif.estado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración General */}
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identidad de la Empresa</CardTitle>
                <CardDescription>Logo y datos que aparecen en documentos oficiales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo de la Empresa</Label>
                  <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Arrastra o haz clic para subir
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG hasta 2MB
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input id="nombreEmpresa" defaultValue="Rápidos 3T S.A. de C.V." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slogan">Slogan / Lema</Label>
                  <Input id="slogan" defaultValue="Logística de confianza" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos Fiscales</CardTitle>
                <CardDescription>Información fiscal para facturación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input id="rfc" defaultValue="RTT850101XYZ" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razón Social</Label>
                  <Input id="razonSocial" defaultValue="Rápidos Tres T S.A. de C.V." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regimenFiscal">Régimen Fiscal</Label>
                  <Select defaultValue="601">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                      <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                      <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domicilioFiscal">Domicilio Fiscal</Label>
                  <Textarea 
                    id="domicilioFiscal" 
                    defaultValue="Av. Industria Automotriz 123, Parque Industrial, Querétaro, Qro. C.P. 76220"
                    rows={2}
                  />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Guardar Cambios
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuración de Alertas */}
        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Alertas Automáticas</CardTitle>
              <CardDescription>Define cuándo el sistema debe enviar notificaciones automáticas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alerta Combustible */}
              <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-status-warning" />
                    <h4 className="font-medium">Desviación de Combustible</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Alertar cuando la diferencia entre ECM y Ticket exceda el umbral
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor="umbralCombustible" className="text-sm">Umbral:</Label>
                    <Input
                      id="umbralCombustible"
                      type="number"
                      value={configAlertas.umbralCombustible}
                      onChange={(e) => setConfigAlertas(prev => ({
                        ...prev,
                        umbralCombustible: parseInt(e.target.value) || 0
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Switch
                  checked={configAlertas.alertaCombustible}
                  onCheckedChange={(checked) => setConfigAlertas(prev => ({
                    ...prev,
                    alertaCombustible: checked
                  }))}
                />
              </div>

              {/* Alerta Documento Vencido */}
              <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-status-danger" />
                    <h4 className="font-medium">Documento Próximo a Vencer</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Alertar cuando un documento de unidad esté próximo a vencer
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor="diasAnticipacion" className="text-sm">Días de anticipación:</Label>
                    <Input
                      id="diasAnticipacion"
                      type="number"
                      value={configAlertas.diasAnticipacionDocumento}
                      onChange={(e) => setConfigAlertas(prev => ({
                        ...prev,
                        diasAnticipacionDocumento: parseInt(e.target.value) || 0
                      }))}
                      className="w-20"
                    />
                  </div>
                </div>
                <Switch
                  checked={configAlertas.alertaDocumentoVencido}
                  onCheckedChange={(checked) => setConfigAlertas(prev => ({
                    ...prev,
                    alertaDocumentoVencido: checked
                  }))}
                />
              </div>

              {/* Alerta Retraso Viaje */}
              <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h4 className="font-medium">Retraso en Viaje</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Alertar cuando un viaje tenga retraso significativo
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor="minutosRetraso" className="text-sm">Minutos de retraso:</Label>
                    <Input
                      id="minutosRetraso"
                      type="number"
                      value={configAlertas.minutosRetraso}
                      onChange={(e) => setConfigAlertas(prev => ({
                        ...prev,
                        minutosRetraso: parseInt(e.target.value) || 0
                      }))}
                      className="w-20"
                    />
                  </div>
                </div>
                <Switch
                  checked={configAlertas.alertaRetrasoViaje}
                  onCheckedChange={(checked) => setConfigAlertas(prev => ({
                    ...prev,
                    alertaRetrasoViaje: checked
                  }))}
                />
              </div>

              <Button onClick={handleSaveConfig} className="bg-primary hover:bg-primary/90">
                <Settings className="w-4 h-4 mr-2" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plantillas de Correo */}
        <TabsContent value="correos">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Plantillas</CardTitle>
                <CardDescription>Selecciona una plantilla para editar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plantillas.map((plantilla) => (
                  <Button
                    key={plantilla.id}
                    variant={selectedPlantilla?.id === plantilla.id ? "default" : "outline"}
                    className={`w-full justify-start text-left h-auto py-3 ${
                      selectedPlantilla?.id === plantilla.id 
                        ? 'bg-primary text-primary-foreground' 
                        : ''
                    }`}
                    onClick={() => setSelectedPlantilla(plantilla)}
                  >
                    <Mail className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">{plantilla.nombre}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedPlantilla ? 'Editar Plantilla' : 'Selecciona una Plantilla'}
                </CardTitle>
                <CardDescription>
                  {selectedPlantilla 
                    ? 'Modifica el asunto y cuerpo del correo' 
                    : 'Haz clic en una plantilla de la lista para editarla'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPlantilla ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombrePlantilla">Nombre de la Plantilla</Label>
                      <Input
                        id="nombrePlantilla"
                        value={selectedPlantilla.nombre}
                        onChange={(e) => setSelectedPlantilla(prev => 
                          prev ? { ...prev, nombre: e.target.value } : null
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asuntoPlantilla">Asunto del Correo</Label>
                      <Input
                        id="asuntoPlantilla"
                        value={selectedPlantilla.asunto}
                        onChange={(e) => setSelectedPlantilla(prev => 
                          prev ? { ...prev, asunto: e.target.value } : null
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables disponibles: [SERVICIO_ID], [FACTURA_ID], [CLIENTE], [FECHA]
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cuerpoPlantilla">Cuerpo del Correo</Label>
                      <Textarea
                        id="cuerpoPlantilla"
                        value={selectedPlantilla.cuerpo}
                        onChange={(e) => setSelectedPlantilla(prev => 
                          prev ? { ...prev, cuerpo: e.target.value } : null
                        )}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: [SERVICIO_ID], [ESTATUS], [UBICACION], [FECHA_HORA], [MONTO], [FECHA_VENCIMIENTO], [UNIDAD], [TIPO_DOCUMENTO]
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSavePlantilla} className="bg-primary hover:bg-primary/90">
                        Guardar Plantilla
                      </Button>
                      <Button variant="outline">
                        Vista Previa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Mail className="w-12 h-12 mb-4 opacity-50" />
                    <p>Selecciona una plantilla de la lista izquierda para comenzar a editarla</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificacionesConfig;
