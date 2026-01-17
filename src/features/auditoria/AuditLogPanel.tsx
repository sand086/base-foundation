import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/dialog';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Globe,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye,
  Download,
  LogIn,
  LogOut,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock audit log data
export interface AuditLogEntry {
  id: string;
  usuario: string;
  usuarioAvatar?: string;
  accion: string;
  tipoAccion: 'crear' | 'editar' | 'eliminar' | 'ver' | 'exportar' | 'login' | 'logout' | 'seguridad';
  modulo: string;
  detalles: string;
  ip: string;
  fechaHora: string;
  dispositivo?: string;
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    usuario: 'Carlos Mendoza',
    accion: 'Editó Ticket #CRG-2026-0015',
    tipoAccion: 'editar',
    modulo: 'Combustible',
    detalles: 'Modificó litros de 350L a 380L',
    ip: '192.168.1.45',
    fechaHora: '2026-01-17 14:32:15',
    dispositivo: 'Windows 11 - Chrome',
  },
  {
    id: 'LOG-002',
    usuario: 'María Rodríguez',
    accion: 'Exportó reporte de facturación',
    tipoAccion: 'exportar',
    modulo: 'Tesorería',
    detalles: 'Exportó 156 registros a Excel',
    ip: '192.168.1.22',
    fechaHora: '2026-01-17 13:45:00',
    dispositivo: 'macOS - Safari',
  },
  {
    id: 'LOG-003',
    usuario: 'Roberto Sánchez',
    accion: 'Creó nuevo viaje #VJ-2026-0089',
    tipoAccion: 'crear',
    modulo: 'Despacho',
    detalles: 'Ruta CDMX - Monterrey, Cliente: Sabino del Bene',
    ip: '192.168.1.67',
    fechaHora: '2026-01-17 12:20:30',
    dispositivo: 'Windows 10 - Edge',
  },
  {
    id: 'LOG-004',
    usuario: 'Ana Flores',
    accion: 'Eliminó documento de unidad',
    tipoAccion: 'eliminar',
    modulo: 'Flota',
    detalles: 'Eliminó póliza vencida de unidad T-001',
    ip: '192.168.1.33',
    fechaHora: '2026-01-17 11:15:22',
    dispositivo: 'Android - Chrome Mobile',
  },
  {
    id: 'LOG-005',
    usuario: 'Carlos Mendoza',
    accion: 'Inicio de sesión exitoso',
    tipoAccion: 'login',
    modulo: 'Sistema',
    detalles: 'Autenticación con 2FA',
    ip: '192.168.1.45',
    fechaHora: '2026-01-17 08:00:05',
    dispositivo: 'Windows 11 - Chrome',
  },
  {
    id: 'LOG-006',
    usuario: 'Fernando Torres',
    accion: 'Modificó permisos del rol Operativo',
    tipoAccion: 'seguridad',
    modulo: 'Usuarios',
    detalles: 'Habilitó permiso: exportar_reportes',
    ip: '192.168.1.89',
    fechaHora: '2026-01-16 17:45:10',
    dispositivo: 'Windows 10 - Firefox',
  },
  {
    id: 'LOG-007',
    usuario: 'Lucía Hernández',
    accion: 'Visualizó estado de cuenta',
    tipoAccion: 'ver',
    modulo: 'CxC',
    detalles: 'Cliente: Transportes del Norte',
    ip: '192.168.1.55',
    fechaHora: '2026-01-16 16:30:00',
    dispositivo: 'macOS - Chrome',
  },
  {
    id: 'LOG-008',
    usuario: 'Carlos Mendoza',
    accion: 'Cierre de sesión',
    tipoAccion: 'logout',
    modulo: 'Sistema',
    detalles: 'Sesión cerrada manualmente',
    ip: '192.168.1.45',
    fechaHora: '2026-01-16 18:00:00',
    dispositivo: 'Windows 11 - Chrome',
  },
];

const getActionIcon = (tipo: AuditLogEntry['tipoAccion']) => {
  switch (tipo) {
    case 'crear': return <Plus className="h-3.5 w-3.5" />;
    case 'editar': return <Edit className="h-3.5 w-3.5" />;
    case 'eliminar': return <Trash2 className="h-3.5 w-3.5" />;
    case 'ver': return <Eye className="h-3.5 w-3.5" />;
    case 'exportar': return <Download className="h-3.5 w-3.5" />;
    case 'login': return <LogIn className="h-3.5 w-3.5" />;
    case 'logout': return <LogOut className="h-3.5 w-3.5" />;
    case 'seguridad': return <Shield className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
};

const getActionColor = (tipo: AuditLogEntry['tipoAccion']) => {
  switch (tipo) {
    case 'crear': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'editar': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'eliminar': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'ver': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'exportar': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'login': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'logout': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'seguridad': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

interface AuditLogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogPanel({ open, onOpenChange }: AuditLogPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const modules = ['all', ...new Set(mockAuditLogs.map(log => log.modulo))];
  const actionTypes = ['all', 'crear', 'editar', 'eliminar', 'ver', 'exportar', 'login', 'logout', 'seguridad'];

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = 
      log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detalles.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === 'all' || log.modulo === moduleFilter;
    const matchesAction = actionFilter === 'all' || log.tipoAccion === actionFilter;
    
    return matchesSearch && matchesModule && matchesAction;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <History className="h-4 w-4 text-primary" />
            </div>
            Log de Auditoría
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 py-4 border-b flex-shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, acción o detalles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {modules.filter(m => m !== 'all').map((modulo) => (
                <SelectItem key={modulo} value={modulo}>{modulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="crear">Crear</SelectItem>
              <SelectItem value="editar">Editar</SelectItem>
              <SelectItem value="eliminar">Eliminar</SelectItem>
              <SelectItem value="ver">Ver</SelectItem>
              <SelectItem value="exportar">Exportar</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="seguridad">Seguridad</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-9 gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Log Entries */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 py-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron registros con los filtros aplicados.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Action Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border",
                      getActionColor(log.tipoAccion)
                    )}>
                      {getActionIcon(log.tipoAccion)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.accion}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.modulo}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.detalles}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.usuario}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.fechaHora}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.ip}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <span>Mostrando {filteredLogs.length} de {mockAuditLogs.length} registros</span>
          <span>Datos en tiempo real (simulado)</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for embedding in pages
export function AuditLogCard() {
  const recentLogs = mockAuditLogs.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-xs">
              Últimas acciones en el sistema
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border",
                getActionColor(log.tipoAccion)
              )}>
                {getActionIcon(log.tipoAccion)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{log.accion}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{log.usuario}</span>
                  <span>•</span>
                  <span>{log.fechaHora.split(' ')[1]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
