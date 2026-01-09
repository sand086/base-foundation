import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTable } from '@/features/usuarios/UsersTable';
import { PermisosMatrix } from '@/features/usuarios/PermisosMatrix';
import { AddUserModal, UserFormData } from '@/features/usuarios/AddUserModal';
import { Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

const UsuariosSeguridad = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('usuarios');

  const handleAddUser = (data: UserFormData) => {
    toast.success('Usuario creado correctamente', {
      description: `${data.nombre} ha sido agregado al sistema.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Usuarios y Seguridad"
        description="Administración de usuarios, roles y permisos del sistema"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-10">
          <TabsTrigger
            value="usuarios"
            className="gap-2 data-[state=active]:bg-brand-dark data-[state=active]:text-white"
          >
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="permisos"
            className="gap-2 data-[state=active]:bg-brand-dark data-[state=active]:text-white"
          >
            <Lock className="h-4 w-4" />
            Permisos por Rol
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsersTable onAddUser={() => setIsAddModalOpen(true)} />
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <PermisosMatrix />
        </TabsContent>
      </Tabs>

      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddUser}
      />
    </div>
  );
};

export default UsuariosSeguridad;
