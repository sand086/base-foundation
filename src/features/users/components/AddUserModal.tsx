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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/features/users/components/PasswordInput";
import { useRoles } from "@/features/users/hooks/useRoles";
import { UserPlus, Loader2 } from "lucide-react";

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
  isSaving?: boolean;
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
  isSaving = false,
}: AddUserModalProps) {
  const { roles } = useRoles();

  const form = useForm<UserFormData>({
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

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) form.reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER */}
        <DialogHeader className="px-5 sm:px-8 py-5 sm:py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <UserPlus className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="text-xl sm:text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                Nuevo Usuario
              </DialogTitle>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-1">
                Gestión de Acceso al Sistema
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* FORM BODY */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="p-5 sm:p-8 space-y-5 bg-card/40 dark:bg-card/20 backdrop-blur-sm overflow-y-auto max-h-[calc(90vh-10rem)]"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Carlos"
                        className="h-11 glass-card font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Mendoza"
                        className="h-11 glass-card font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="usuario@rapidos3t.com"
                      className="h-11 glass-card font-bold text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="55 1234 5678"
                        className="h-11 glass-card font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="puesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puesto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Despachador"
                        className="h-11 glass-card font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol de Seguridad</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 glass-card font-bold text-foreground shadow-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-border">
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-red">Contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="••••••••"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-transparent"
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
