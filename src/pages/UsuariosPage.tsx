import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { EnhancedDataTable, ColumnDef } from '@/components/ui/enhanced-data-table';
import { useAdminActions } from '@/hooks/useAdminActions';
import { roles } from '@/data/usuariosData';
import { cn } from '@/lib/utils';
import {
  Users,
  MoreHorizontal,
  Plus,
  Edit,
  Key,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldOff,
  Clock,
  Mail,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddUserModal, UserFormData } from '@/features/usuarios/AddUserModal';
import { EditUserModal, UserData } from '@/features/usuarios/EditUserModal';
// Define a type for user display
interface UserDisplay {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: string;
  estado: string;
  avatar?: string;
  twoFactorEnabled: boolean;
  ultimoAcceso: string;
}

const UsuariosPage = () => {
  const { users, isLoading, resetUserPassword, toggleUserStatus } = useAdminActions();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserData | null>(null);
  
  // User action dialogs
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showToggleStatusDialog, setShowToggleStatusDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  const handleAddUser = (data: UserFormData) => {
    toast.success('Usuario creado correctamente', {
      description: `${data.nombre} ha sido agregado al sistema.`,
    });
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<UserDisplay>[] = [
    {
      key: 'nombre',
      header: 'Usuario',
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user.nombre.charAt(0)}{user.apellidos.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.nombre} {user.apellidos}</p>
            <p className="text-xs text-muted-foreground">{user.puesto}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contacto',
      render: (_, user) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {user.email}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {user.telefono}
          </div>
        </div>
      ),
    },
    {
      key: 'rol',
      header: 'Rol',
      type: 'status',
      statusOptions: roles.map(r => r.id),
      render: (rol) => (
        <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(rol))}>
          {getRoleLabel(rol)}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      type: 'status',
      statusOptions: ['activo', 'inactivo', 'bloqueado'],
      render: (estado) => (
        <Badge variant="outline" className={cn("text-xs capitalize", getStatusBadgeColor(estado))}>
          {estado}
        </Badge>
      ),
    },
    {
      key: 'twoFactorEnabled',
      header: '2FA',
      render: (enabled) => (
        enabled ? (
          <ShieldCheck className="h-5 w-5 text-status-success" />
        ) : (
          <ShieldOff className="h-5 w-5 text-muted-foreground" />
        )
      ),
    },
    {
      key: 'ultimoAcceso',
      header: 'Último Acceso',
      type: 'date',
      render: (value) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {value}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      render: (_, user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedUserForEdit({
                  id: user.id,
                  nombre: user.nombre,
                  apellidos: user.apellidos,
                  email: user.email,
                  telefono: user.telefono,
                  puesto: user.puesto,
                  rol: user.rol,
                  estado: user.estado,
                  avatar: user.avatar,
                  twoFactorEnabled: user.twoFactorEnabled,
                });
                setIsEditModalOpen(true);
              }}
            >
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
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administración de usuarios del sistema"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios del Sistema
              </CardTitle>
              <CardDescription>Gestiona los usuarios y sus accesos</CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-action hover:bg-action-hover text-action-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={users as UserDisplay[]}
            columns={columns}
            exportFileName="usuarios"
          />
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetear Contraseña</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas resetear la contraseña de{' '}
              <strong>{selectedUser?.nombre} {selectedUser?.apellidos}</strong>?
              Se enviará un correo con las instrucciones para crear una nueva contraseña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Resetear Contraseña
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
              ¿Estás seguro de que deseas {selectedUser?.estado === 'activo' ? 'desactivar' : 'activar'} a{' '}
              <strong>{selectedUser?.nombre} {selectedUser?.apellidos}</strong>?
              {selectedUser?.estado === 'activo' && ' El usuario no podrá acceder al sistema.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleStatus}
              className={selectedUser?.estado === 'activo' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {selectedUser?.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Modal */}
      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddUser}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUserForEdit}
        onSave={(data) => {
          toast.success('Usuario actualizado correctamente');
        }}
      />
    </div>
  );
};

export default UsuariosPage;
