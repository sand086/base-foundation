import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { roles, modulos, permisosDefault, Rol, Permiso } from '@/data/usuariosData';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Radio,
  Users,
  Truck,
  Fuel,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Shield,
  Eye,
  Pencil,
  Trash2,
  Download,
  Save,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Radio,
  Users,
  Truck,
  Fuel,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Shield,
};

export function PermisosMatrix() {
  const [selectedRol, setSelectedRol] = useState<string>('admin');
  const [permisos, setPermisos] = useState(permisosDefault);

  const currentRolPermisos = permisos.find(p => p.rolId === selectedRol)?.permisos || [];

  const handleToggle = (moduloId: string, field: 'ver' | 'editar' | 'eliminar' | 'exportar') => {
    setPermisos(prev => 
      prev.map(rp => {
        if (rp.rolId !== selectedRol) return rp;
        return {
          ...rp,
          permisos: rp.permisos.map(p => {
            if (p.moduloId !== moduloId) return p;
            return { ...p, [field]: !p[field] };
          }),
        };
      })
    );
  };

  const getPermiso = (moduloId: string): Permiso => {
    return currentRolPermisos.find(p => p.moduloId === moduloId) || 
      { moduloId, ver: false, editar: false, eliminar: false, exportar: false };
  };

  const getRolBadgeColor = (rol: Rol) => {
    switch (rol.color) {
      case 'danger':
        return 'bg-status-danger-bg text-status-danger border-status-danger-border';
      case 'success':
        return 'bg-status-success-bg text-status-success border-status-success-border';
      case 'warning':
        return 'bg-status-warning-bg text-status-warning border-status-warning-border';
      case 'info':
        return 'bg-status-info-bg text-status-info border-status-info-border';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleSaveChanges = () => {
    toast.success('Permisos actualizados', {
      description: `Los permisos del rol "${roles.find(r => r.id === selectedRol)?.nombre}" han sido guardados correctamente.`,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-4">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Sidebar - Roles List */}
        <div className="w-64 border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-primary">
            <h3 className="text-xs font-semibold text-primary-foreground uppercase tracking-wider">
              Roles del Sistema
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {roles.map((rol) => (
                <button
                  key={rol.id}
                  onClick={() => setSelectedRol(rol.id)}
                  className={cn(
                    "w-full text-left p-3 rounded transition-colors",
                    selectedRol === rol.id
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {rol.nombre}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-2 py-0.5", getRolBadgeColor(rol))}
                    >
                      {rol.id.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rol.descripcion}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Permissions Matrix */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-primary flex items-center justify-between">
            <h3 className="text-xs font-semibold text-primary-foreground uppercase tracking-wider">
              Permisos: {roles.find(r => r.id === selectedRol)?.nombre}
            </h3>
            <div className="flex items-center gap-6 text-[10px] text-primary-foreground/80 uppercase tracking-wide">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> Ver
              </div>
              <div className="flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Editar
              </div>
              <div className="flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Eliminar
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" /> Exportar
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {modulos.map((modulo) => {
                const IconComponent = iconMap[modulo.icono] || Shield;
                const permiso = getPermiso(modulo.id);
                
                return (
                  <div
                    key={modulo.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {modulo.nombre}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-10">
                      <Switch
                        checked={permiso.ver}
                        onCheckedChange={() => handleToggle(modulo.id, 'ver')}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Switch
                        checked={permiso.editar}
                        onCheckedChange={() => handleToggle(modulo.id, 'editar')}
                        disabled={!permiso.ver}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Switch
                        checked={permiso.eliminar}
                        onCheckedChange={() => handleToggle(modulo.id, 'eliminar')}
                        disabled={!permiso.ver}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Switch
                        checked={permiso.exportar}
                        onCheckedChange={() => handleToggle(modulo.id, 'exportar')}
                        disabled={!permiso.ver}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer with Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveChanges}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Save className="h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
