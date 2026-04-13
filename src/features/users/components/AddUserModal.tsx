import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-500/20">
              <UserPlus className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Nuevo Usuario
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Gestión de Acceso al Sistema
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
              {/* TARJETA: Datos Personales */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Nombre
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Carlos"
                            className="h-11 shadow-sm font-bold uppercase"
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
                        <FormLabel variant="brand" required>
                          Apellidos
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Mendoza"
                            className="h-11 shadow-sm font-bold uppercase"
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
                      <FormLabel variant="brand" required>
                        Correo Electrónico
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@rapidos3t.com"
                          className="h-11 shadow-sm font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          Teléfono
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="55 1234 5678"
                            className="h-11 shadow-sm font-mono uppercase font-bold tracking-widest"
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
                        <FormLabel variant="brand" required>
                          Puesto
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Despachador"
                            className="h-11 shadow-sm font-bold uppercase"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* TARJETA: Seguridad y Acceso */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="rol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Rol de Seguridad
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 shadow-sm font-bold text-foreground">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                            {(Array.isArray(roles) ? roles : []).map((rol) => (
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
                        <FormLabel variant="brand" required className="text-destructive">
                          Contraseña
                        </FormLabel>
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
              </div>
            </div>

            {/* CAPA 5: FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white bg-brand-red hover:bg-brand-red/80 shadow-lg shadow-brand-red/20 font-black uppercase tracking-widest text-[10px]"
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
