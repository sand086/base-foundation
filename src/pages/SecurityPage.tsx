import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useAdminActions } from '@/hooks/useAdminActions';
import { roles, modulos, permisosDefault, Rol, Permiso, RolPermisos } from '@/data/usuariosData';
import { cn } from '@/lib/utils';
import {
  Users,
  Shield,
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Key,
  UserX,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  Download,
  Save,
  Loader2,
  Filter,
  ShieldCheck,
  ShieldOff,
  Clock,
  LayoutDashboard,
  Radio,
  Truck,
  Fuel,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
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

const SecurityPage = () => {
  const { users, isLoading, resetUserPassword, toggleUserStatus, updateUser } = useAdminActions();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  
  // Role editor state
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [permisos, setPermisos] = useState<RolPermisos[]>(permisosDefault);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  // User action dialogs
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showToggleStatusDialog, setShowToggleStatusDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = filterRol === 'all' || user.rol === filterRol;
    const matchesEstado = filterEstado === 'all' || user.estado === filterEstado;
    return matchesSearch && matchesRol && matchesEstado;
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

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

  const getStatusBadgeColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-status-success-bg text-status-success border-status-success-border';
      case 'inactivo': return 'bg-muted text-muted-foreground border-border';
      case 'bloqueado': return 'bg-status-danger-bg text-status-danger border-status-danger-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      operativo: 'Operativo',
      finanzas: 'Finanzas',
      supervisor: 'Supervisor',
      taller: 'Taller',
    };
    return labels[rol] || rol;
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

  const handleSavePermisos = () => {
    toast.success('Permisos actualizados', {
      description: `Los permisos del rol "${roles.find(r => r.id === selectedRoleId)?.nombre}" han sido guardados.`,
    });
    setShowRoleEditor(false);
  };

  const handleResetPassword = async () => {
    if (selectedUserId) {
      await resetUserPassword(selectedUserId);
      setShowResetPasswordDialog(false);
      setSelectedUserId(null);
    }
  };

  const handleToggleStatus = async () => {
    if (selectedUserId) {
      await toggleUserStatus(selectedUserId);
      setShowToggleStatusDialog(false);
      setSelectedUserId(null);
    }
  };

  const openRoleEditor = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsCreatingRole(false);
    setShowRoleEditor(true);
  };

  const openNewRoleEditor = () => {
    setIsCreatingRole(true);
    setNewRoleName('');
    setSelectedRoleId('');
    setShowRoleEditor(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Seguridad y Accesos"
        description="Administración de usuarios, roles y permisos del sistema"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-10">
          <TabsTrigger
            value="usuarios"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="h-4 w-4" />
            Roles y Permisos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Usuarios */}
        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios del Sistema</CardTitle>
                  <CardDescription>Gestiona los usuarios y sus accesos</CardDescription>
                </div>
                <Button className="bg-action hover:bg-action-hover text-action-foreground gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterRol} onValueChange={setFilterRol}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {roles.map(rol => (
                      <SelectItem key={rol.id} value={rol.id}>{rol.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">2FA</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último Acceso</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {user.nombre.charAt(0)}{user.apellidos.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.nombre} {user.apellidos}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(user.rol))}>
                            {getRoleLabel(user.rol)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs capitalize", getStatusBadgeColor(user.estado))}>
                            {user.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {user.twoFactorEnabled ? (
                            <ShieldCheck className="h-5 w-5 text-status-success" />
                          ) : (
                            <ShieldOff className="h-5 w-5 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {user.ultimoAcceso}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setShowResetPasswordDialog(true);
                                }}
                              >
                                <Key className="mr-2 h-4 w-4" />
                                Resetear Contraseña
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setShowToggleStatusDialog(true);
                                }}
                                className={user.estado === 'activo' ? 'text-destructive' : 'text-status-success'}
                              >
                                {user.estado === 'activo' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <p>Mostrando {filteredUsers.length} de {users.length} usuarios</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Roles */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles del Sistema</CardTitle>
                  <CardDescription>Gestiona los roles y sus permisos por módulo</CardDescription>
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
                  
                  return (
                    <Card 
                      key={rol.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openRoleEditor(rol.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-primary" />
                          </div>
                          <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(rol.id))}>
                            {rol.id.toUpperCase()}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{rol.nombre}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{rol.descripcion}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{totalPermisos}</span> / {maxPermisos} permisos
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Editor Sheet */}
      <Sheet open={showRoleEditor} onOpenChange={setShowRoleEditor}>
        <SheetContent className="sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isCreatingRole ? 'Nuevo Rol' : `Permisos: ${roles.find(r => r.id === selectedRoleId)?.nombre}`}
            </SheetTitle>
            <SheetDescription>
              {isCreatingRole 
                ? 'Define el nombre y permisos del nuevo rol'
                : 'Configura los permisos para cada módulo del sistema'
              }
            </SheetDescription>
          </SheetHeader>

          {isCreatingRole && (
            <div className="py-4 border-b">
              <label className="text-sm font-medium">Nombre del Rol</label>
              <Input 
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ej: Auditor"
                className="mt-1"
              />
            </div>
          )}

          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Permission Headers */}
            <div className="sticky top-0 bg-background z-10 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Módulo</span>
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 w-12 justify-center">
                  <Eye className="h-3 w-3" /> Ver
                </div>
                <div className="flex items-center gap-1 w-12 justify-center">
                  <Pencil className="h-3 w-3" /> Editar
                </div>
                <div className="flex items-center gap-1 w-12 justify-center">
                  <Trash2 className="h-3 w-3" /> Eliminar
                </div>
                <div className="flex items-center gap-1 w-12 justify-center">
                  <Download className="h-3 w-3" /> Exportar
                </div>
              </div>
            </div>

            {/* Modules List */}
            <div className="divide-y">
              {modulos.map((modulo) => {
                const IconComponent = iconMap[modulo.icono] || Shield;
                const permiso = getPermiso(modulo.id);
                
                return (
                  <div
                    key={modulo.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{modulo.nombre}</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={permiso.ver}
                          onCheckedChange={() => handleTogglePermiso(modulo.id, 'ver')}
                          className="data-[state=checked]:bg-action"
                        />
                      </div>
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={permiso.editar}
                          onCheckedChange={() => handleTogglePermiso(modulo.id, 'editar')}
                          disabled={!permiso.ver}
                          className="data-[state=checked]:bg-action"
                        />
                      </div>
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={permiso.eliminar}
                          onCheckedChange={() => handleTogglePermiso(modulo.id, 'eliminar')}
                          disabled={!permiso.ver}
                          className="data-[state=checked]:bg-action"
                        />
                      </div>
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={permiso.exportar}
                          onCheckedChange={() => handleTogglePermiso(modulo.id, 'exportar')}
                          disabled={!permiso.ver}
                          className="data-[state=checked]:bg-action"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowRoleEditor(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePermisos}
              disabled={isLoading}
              className="bg-action hover:bg-action-hover text-action-foreground gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Permisos
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetear Contraseña</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email a <strong>{selectedUser?.email}</strong> con una nueva contraseña temporal.
              El usuario deberá cambiarla en su próximo inicio de sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Enviar Nueva Contraseña
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={showToggleStatusDialog} onOpenChange={setShowToggleStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.estado === 'activo' ? 'Desactivar Usuario' : 'Activar Usuario'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.estado === 'activo' 
                ? `${selectedUser?.nombre} ya no podrá acceder al sistema hasta que se reactive su cuenta.`
                : `${selectedUser?.nombre} podrá acceder nuevamente al sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleStatus}
              className={selectedUser?.estado === 'activo' ? 'bg-destructive hover:bg-destructive/90' : 'bg-action hover:bg-action-hover'}
            >
              {selectedUser?.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SecurityPage;
