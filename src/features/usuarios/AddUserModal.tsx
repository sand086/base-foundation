import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useRoles";
import { UserPlus } from "lucide-react";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => void;
}

// Interfaz actualizada para que coincida exactamente con la edición
export interface UserFormData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: string;
  password: string;
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
}: AddUserModalProps) {
  const { roles } = useRoles();

  const [formData, setFormData] = useState<UserFormData>({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    puesto: "",
    rol: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Limpiar formulario
    setFormData({
      nombre: "",
      apellidos: "",
      email: "",
      telefono: "",
      puesto: "",
      rol: "",
      password: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            Agregar Nuevo Usuario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="nombre"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Nombre
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Carlos"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="apellidos"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Apellidos
              </Label>
              <Input
                id="apellidos"
                placeholder="Ej: Mendoza García"
                value={formData.apellidos}
                onChange={(e) =>
                  setFormData({ ...formData, apellidos: e.target.value })
                }
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@rapidos3t.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="telefono"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Teléfono
              </Label>
              <Input
                id="telefono"
                placeholder="Ej: 55 1234 5678"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="puesto"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Puesto
              </Label>
              <Input
                id="puesto"
                placeholder="Ej: Despachador"
                value={formData.puesto}
                onChange={(e) =>
                  setFormData({ ...formData, puesto: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="rol"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Rol
              </Label>
              <Select
                value={formData.rol}
                onValueChange={(value) =>
                  setFormData({ ...formData, rol: value })
                }
                required
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((rol) => (
                    <SelectItem
                      key={rol.id}
                      value={rol.id.toString()}
                      className="text-sm"
                    >
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              className="h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Guardar Usuario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
