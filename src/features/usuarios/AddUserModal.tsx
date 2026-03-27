import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// 1. ESQUEMA DE VALIDACIÓN ZOD
const userSchema = z.object({
  nombre: z.string().min(2, "El nombre es demasiado corto"),
  apellidos: z.string().min(2, "Los apellidos son requeridos"),
  email: z.string().email("Correo electrónico no válido"),
  telefono: z
    .string()
    .min(10, "Mínimo 10 dígitos")
    .optional()
    .or(z.literal("")),
  puesto: z.string().min(2, "Especifica el puesto"),
  rol: z.string().min(1, "Selecciona un rol de seguridad"),
  password: z.string().min(8, "La contraseña requiere mínimo 8 caracteres"),
});

export type UserFormData = z.infer<typeof userSchema>;

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => void;
  isSaving?: boolean; // Agregado para feedback de carga
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
  isSaving = false,
}: AddUserModalProps) {
  const { roles } = useRoles();

  // 2. CONFIGURACIÓN DE REACT HOOK FORM
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      email: "",
      telefono: "",
      puesto: "",
      rol: "",
      password: "",
    },
  });

  const selectedRol = watch("rol");

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER: Navy Premium con Text Shadow para legibilidad */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <UserPlus className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col">
              {/* text-white con shadow para que no se pierda */}
              <DialogTitle className="text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                Nuevo Usuario
              </DialogTitle>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">
                Gestión de Acceso al Sistema
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* FORM BODY: Cristal translúcido con Validaciones */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-8 space-y-5 bg-white/40 backdrop-blur-sm"
        >
          <div className="grid grid-cols-2 gap-5">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label variant="brand" required>
                Nombre
              </Label>
              <Input
                {...register("nombre")}
                placeholder="Ej: Carlos"
                className={cn(
                  "h-11 glass-card border-slate-200 focus:ring-brand-red/20 font-medium",
                  errors.nombre &&
                    "border-brand-red/50 bg-destructive/5 animate-pulse-danger",
                )}
              />
              {errors.nombre && (
                <p className="text-brand-red text-[9px] font-black uppercase tracking-widest mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            {/* Apellidos */}
            <div className="space-y-1.5">
              <Label variant="brand" required>
                Apellidos
              </Label>
              <Input
                {...register("apellidos")}
                placeholder="Ej: Mendoza"
                className={cn(
                  "h-11 glass-card border-slate-200 focus:ring-brand-red/20 font-medium",
                  errors.apellidos &&
                    "border-brand-red/50 bg-destructive/5 animate-pulse-danger",
                )}
              />
              {errors.apellidos && (
                <p className="text-brand-red text-[9px] font-black uppercase tracking-widest mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                  {errors.apellidos.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label variant="brand" required>
              Correo Electrónico
            </Label>
            <Input
              {...register("email")}
              type="email"
              placeholder="usuario@rapidos3t.com"
              className={cn(
                "h-11 glass-card border-slate-200 focus:ring-brand-red/20 font-bold text-brand-navy",
                errors.email && "border-brand-red/50 bg-destructive/5",
              )}
            />
            {errors.email && (
              <p className="text-brand-red text-[9px] font-black uppercase tracking-widest mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label variant="brand">Teléfono</Label>
              <Input
                {...register("telefono")}
                placeholder="55 1234 5678"
                className="h-11 glass-card border-slate-200 focus:ring-brand-red/20 font-mono"
              />
            </div>

            {/* Puesto */}
            <div className="space-y-1.5">
              <Label variant="brand">Puesto</Label>
              <Input
                {...register("puesto")}
                placeholder="Ej: Despachador"
                className={cn(
                  "h-11 glass-card border-slate-200 focus:ring-brand-red/20 font-medium",
                  errors.puesto && "border-brand-red/50 bg-destructive/5",
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Rol Select */}
            <div className="space-y-1.5">
              <Label variant="brand" required>
                Rol de Seguridad
              </Label>
              <Select
                onValueChange={(v) => setValue("rol", v)}
                value={selectedRol}
              >
                <SelectTrigger
                  className={cn(
                    "h-11 glass-card border-slate-200 font-bold text-slate-700 shadow-sm",
                    errors.rol && "border-brand-red/50 bg-destructive/5",
                  )}
                >
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="glass-panel border-white/20">
                  {roles.map((rol) => (
                    <SelectItem
                      key={rol.id}
                      value={rol.id.toString()}
                      className="font-semibold"
                    >
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rol && (
                <p className="text-brand-red text-[9px] font-black uppercase tracking-widest mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                  {errors.rol.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label variant="brand" required className="text-brand-red">
                Contraseña
              </Label>
              <Input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={cn(
                  "h-11 glass-card border-brand-red/20 focus:ring-brand-red/20 font-mono",
                  errors.password && "border-brand-red/50 bg-destructive/5",
                )}
              />
              {errors.password && (
                <p className="text-brand-red text-[9px] font-black uppercase tracking-widest mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* FOOTER: Barra estilo Safari con desenfoque */}
          <div className="flex justify-end gap-4 pt-6 border-t border-white/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="btn-primary-gradient h-11 px-10 font-black uppercase text-[11px] tracking-[0.2em] shadow-lg active:scale-95 transition-transform"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                "Guardar Usuario"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
