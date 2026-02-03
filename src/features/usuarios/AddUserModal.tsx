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
import { roles } from "@/data/usuariosData";
import { UserPlus } from "lucide-react";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => void;
}

export interface UserFormData {
  nombre: string;
  email: string;
  apellido?: string;
  password: string;
  telefono?: string;
  puesto?: string;
  rol: string;
  empresa: string;
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
}: AddUserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    nombre: "",
    email: "",
    password: "",
    rol: "",
    empresa: "Rápidos 3T",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      nombre: "",
      email: "",
      password: "",
      rol: "",
      empresa: "Rápidos 3T",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            Agregar Nuevo Usuario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label
              htmlFor="nombre"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Nombre Completo
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Carlos Mendoza García"
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
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="h-9 text-sm"
            />
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
                    <SelectItem key={rol.id} value={rol.id} className="text-sm">
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="empresa"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Empresa
              </Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) =>
                  setFormData({ ...formData, empresa: e.target.value })
                }
                required
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
