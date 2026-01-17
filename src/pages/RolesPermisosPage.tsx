import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { roles, modulos, permisosDefault, Rol, Permiso, RolPermisos } from '@/data/usuariosData';
import { cn } from '@/lib/utils';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
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
  Eye,
  Pencil,
  Download,
  Lock,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

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

const RolesPermisosPage = () => {
  // Role editor state
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [permisos, setPermisos] = useState<RolPermisos[]>(permisosDefault);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  // Role badge colors
  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-status-danger-bg text-status-danger border-status-danger-border';
      case 'operativo': return 'bg-status-info-bg text-status-info border-status-info-border';
      case 'finanzas': return 'bg-status-success-bg text-status-success border-status-success-border';
      case 'supervisor': return 'bg-status-warning-bg text-status-warning border-status-warning-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Permission matrix handlers
  const currentRolPermisos = permisos.find(p => p.rolId === selectedRoleId)?.permisos || [];

  const handleTogglePermiso = (moduloId: string, field: 'ver' | 'editar' | 'eliminar' | 'exportar') => {
    setPermisos(prev => 
      prev.map(rp => {
        if (rp.rolId !== selectedRoleId) return rp;
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

  const handleSavePermisos = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    
    toast.success('Permisos actualizados', {
      description: `Los permisos del rol "${roles.find(r => r.id === selectedRoleId)?.nombre || newRoleName}" han sido guardados.`,
    });
    setShowRoleEditor(false);
  };

  const openRoleEditor = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsCreatingRole(false);
    setShowRoleEditor(true);
  };

  const openNewRoleEditor = () => {
    setIsCreatingRole(true);
    setNewRoleName('');
    setNewRoleDescription('');
    setSelectedRoleId('');
    setShowRoleEditor(true);
  };

  const handleDeleteRole = () => {
    if (roleToDelete) {
      toast.success('Rol eliminado', {
        description: `El rol ha sido eliminado correctamente.`,
      });
      setShowDeleteDialog(false);
      setRoleToDelete(null);
    }
  };

  const handleDuplicateRole = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Rol duplicado', {
      description: 'Se ha creado una copia del rol. Edítalo para personalizar los permisos.',
    });
  };

  const handleToggleAllModulePermisos = (moduloId: string) => {
    const permiso = getPermiso(moduloId);
    const allEnabled = permiso.ver && permiso.editar && permiso.eliminar && permiso.exportar;
    
    setPermisos(prev =>
      prev.map(rp => {
        if (rp.rolId !== selectedRoleId) return rp;
        return {
          ...rp,
          permisos: rp.permisos.map(p => {
            if (p.moduloId !== moduloId) return p;
            return { 
              ...p, 
              ver: !allEnabled, 
              editar: !allEnabled, 
              eliminar: !allEnabled, 
              exportar: !allEnabled 
            };
          }),
        };
      })
    );
  };

  const handleToggleColumnPermiso = (field: 'ver' | 'editar' | 'eliminar' | 'exportar') => {
    const allEnabled = modulos.every(m => getPermiso(m.id)[field]);
    
    setPermisos(prev =>
      prev.map(rp => {
        if (rp.rolId !== selectedRoleId) return rp;
        return {
          ...rp,
          permisos: rp.permisos.map(p => ({
            ...p,
            [field]: !allEnabled,
          })),
        };
      })
    );
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Roles y Permisos"
        description="Gestiona los roles del sistema y sus permisos por módulo"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles del Sistema
              </CardTitle>
              <CardDescription>Configura los permisos de cada rol para controlar el acceso a los módulos</CardDescription>
            </div>
            <Button 
              onClick={openNewRoleEditor}
              className="bg-action hover:bg-action-hover text-action-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((rol) => {
              const rolPermisos = permisos.find(p => p.rolId === rol.id);
              const totalPermisos = rolPermisos?.permisos.reduce((acc, p) => 
                acc + (p.ver ? 1 : 0) + (p.editar ? 1 : 0) + (p.eliminar ? 1 : 0) + (p.exportar ? 1 : 0), 0
              ) || 0;
              const maxPermisos = modulos.length * 4;
              const isSystemRole = ['admin', 'operativo', 'finanzas'].includes(rol.id);
              
              return (
                <Card 
                  key={rol.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
                  onClick={() => openRoleEditor(rol.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isSystemRole && (
                          <Badge variant="outline" className="text-xs bg-muted">
                            <Lock className="h-3 w-3 mr-1" />
                            Sistema
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(rol.id))}>
                          {rol.id.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">{rol.nombre}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{rol.descripcion}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(totalPermisos / maxPermisos) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {totalPermisos}/{maxPermisos} permisos
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleDuplicateRole(rol.id, e)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!isSystemRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(rol.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Permissions Legend */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3">Leyenda de Permisos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Ver: Acceso de lectura</span>
              </div>
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Editar: Modificar datos</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="text-sm">Eliminar: Borrar registros</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-green-500" />
                <span className="text-sm">Exportar: Descargar datos</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Editor Sheet */}
      <Sheet open={showRoleEditor} onOpenChange={setShowRoleEditor}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="space-y-3">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isCreatingRole ? 'Crear Nuevo Rol' : `Editar Permisos: ${roles.find(r => r.id === selectedRoleId)?.nombre}`}
            </SheetTitle>
            <SheetDescription>
              {isCreatingRole 
                ? 'Define el nombre y los permisos para el nuevo rol'
                : 'Configura los permisos de este rol para cada módulo del sistema'
              }
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* New Role Form */}
            {isCreatingRole && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del Rol</label>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ej: Contador, Almacenista..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Input
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Describe las responsabilidades de este rol..."
                  />
                </div>
              </div>
            )}

            {/* Permissions Matrix */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Matriz de Permisos</h4>
                <p className="text-xs text-muted-foreground">Click en la fila para toggle todos</p>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Módulo
                      </th>
                      <th className="text-center px-3 py-3">
                        <button 
                          onClick={() => handleToggleColumnPermiso('ver')}
                          className="flex flex-col items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span className="text-xs font-medium">Ver</span>
                        </button>
                      </th>
                      <th className="text-center px-3 py-3">
                        <button 
                          onClick={() => handleToggleColumnPermiso('editar')}
                          className="flex flex-col items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-medium">Editar</span>
                        </button>
                      </th>
                      <th className="text-center px-3 py-3">
                        <button 
                          onClick={() => handleToggleColumnPermiso('eliminar')}
                          className="flex flex-col items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-medium">Eliminar</span>
                        </button>
                      </th>
                      <th className="text-center px-3 py-3">
                        <button 
                          onClick={() => handleToggleColumnPermiso('exportar')}
                          className="flex flex-col items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Download className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium">Exportar</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {modulos.map((modulo) => {
                      const permiso = getPermiso(modulo.id);
                      const IconComponent = iconMap[modulo.icono] || LayoutDashboard;
                      const allEnabled = permiso.ver && permiso.editar && permiso.eliminar && permiso.exportar;
                      
                      return (
                        <tr 
                          key={modulo.id} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors cursor-pointer",
                            allEnabled && "bg-primary/5"
                          )}
                          onClick={() => handleToggleAllModulePermisos(modulo.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{modulo.nombre}</p>
                                {allEnabled && (
                                  <span className="text-xs text-status-success flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Acceso completo
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={permiso.ver}
                              onCheckedChange={() => handleTogglePermiso(modulo.id, 'ver')}
                              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                          </td>
                          <td className="text-center px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={permiso.editar}
                              onCheckedChange={() => handleTogglePermiso(modulo.id, 'editar')}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                          </td>
                          <td className="text-center px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={permiso.eliminar}
                              onCheckedChange={() => handleTogglePermiso(modulo.id, 'eliminar')}
                              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                            />
                          </td>
                          <td className="text-center px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={permiso.exportar}
                              onCheckedChange={() => handleTogglePermiso(modulo.id, 'exportar')}
                              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowRoleEditor(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePermisos}
              disabled={isSaving || (isCreatingRole && !newRoleName.trim())}
              className="bg-action hover:bg-action-hover text-action-foreground gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Role Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer.
              Los usuarios asignados a este rol deberán ser reasignados a otro rol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRole}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesPermisosPage;
