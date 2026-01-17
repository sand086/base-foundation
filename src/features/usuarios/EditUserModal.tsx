import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roles } from '@/data/usuariosData';
import { PasswordInput } from '@/components/usuarios/PasswordInput';
import { ImageUpload } from '@/components/usuarios/ImageUpload';
import { Edit, User, Lock, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface UserData {
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
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (data: UserData & { password?: string }) => void;
}

export function EditUserModal({ open, onOpenChange, user, onSave }: EditUserModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UserData & { password: string }>({
    id: '',
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    puesto: '',
    rol: '',
    estado: 'activo',
    avatar: undefined,
    twoFactorEnabled: false,
    password: '',
  });

  // Load user data when modal opens
  useEffect(() => {
    if (user && open) {
      setFormData({
        ...user,
        password: '',
      });
      setActiveTab('general');
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const { password, ...userData } = formData;
    onSave({ ...userData, password: password || undefined });
    
    setIsSaving(false);
    toast.success('Usuario actualizado', {
      description: `Los datos de ${formData.nombre} han sido guardados.`,
    });
    onOpenChange(false);
  };

  if (!user) return null;

  const initials = `${formData.nombre.charAt(0)}${formData.apellidos.charAt(0)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Edit className="h-4 w-4 text-primary" />
            </div>
            Editar Usuario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="general" className="gap-1.5">
                <User className="h-3.5 w-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="imagen" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Imagen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Apellidos
                  </Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="puesto" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Puesto
                  </Label>
                  <Input
                    id="puesto"
                    value={formData.puesto}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Rol
                  </Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value) => setFormData({ ...formData, rol: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id} className="text-sm">
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estado
                  </Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo" className="text-sm">Activo</SelectItem>
                      <SelectItem value="inactivo" className="text-sm">Inactivo</SelectItem>
                      <SelectItem value="bloqueado" className="text-sm">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seguridad" className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nueva Contraseña
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Deja vacío para mantener la contraseña actual.
                </p>
                <PasswordInput
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  placeholder="Nueva contraseña"
                  showGenerator
                  showStrength
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Autenticación de dos factores</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requiere un código adicional al iniciar sesión
                  </p>
                </div>
                <Switch
                  checked={formData.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, twoFactorEnabled: checked })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="imagen" className="py-4">
              <ImageUpload
                value={formData.avatar}
                onChange={(value) => setFormData({ ...formData, avatar: value })}
                fallback={initials}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
