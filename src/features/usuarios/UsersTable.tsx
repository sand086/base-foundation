import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usuarios, roles, Usuario } from '@/data/usuariosData';
import { cn } from '@/lib/utils';
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  Filter,
} from 'lucide-react';

interface UsersTableProps {
  onAddUser: () => void;
}

export function UsersTable({ onAddUser }: UsersTableProps) {
  const [search, setSearch] = useState('');
  const [users] = useState<Usuario[]>(usuarios);

  const filteredUsers = users.filter(
    (user) =>
      user.nombre.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRolBadge = (rolId: string) => {
    const rol = roles.find(r => r.id === rolId);
    if (!rol) return null;

    const colorClasses = {
      danger: 'bg-status-danger-bg text-status-danger border-status-danger-border',
      success: 'bg-status-success-bg text-status-success border-status-success-border',
      warning: 'bg-status-warning-bg text-status-warning border-status-warning-border',
      info: 'bg-status-info-bg text-status-info border-status-info-border',
    };

    return (
      <Badge
        variant="outline"
        className={cn('text-[10px] px-2 py-0.5 font-medium', colorClasses[rol.color])}
      >
        {rol.nombre}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
        </div>
        
        <Button
          onClick={onAddUser}
          className="h-9 gap-2 bg-brand-green hover:bg-brand-green/90 text-white"
        >
          <UserPlus className="h-4 w-4" />
          Agregar Usuario
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table className="table-dense">
          <TableHeader>
            <TableRow className="bg-table-header hover:bg-table-header">
              <TableHead className="w-[280px]">Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead className="w-[60px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-brand-dark text-white text-xs">
                        {getInitials(user.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-brand-dark">
                        {user.nombre}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getRolBadge(user.rol)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.empresa}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={user.estado === 'activo' ? 'success' : 'danger'}>
                    {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.ultimoAcceso}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-sm gap-2">
                        <Pencil className="h-3 w-3" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-sm gap-2">
                        <Key className="h-3 w-3" />
                        Cambiar Contraseña
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-sm gap-2 text-status-danger">
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando {filteredUsers.length} de {users.length} usuarios
        </span>
      </div>
    </div>
  );
}
