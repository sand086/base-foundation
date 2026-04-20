import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/features/users/components/PasswordInput";
import { ImageUpload } from "@/features/users/components/ImageUpload";
import {
  Edit,
  User,
  Lock,
  Image as ImageIcon,
  Loader2,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/features/users/hooks/useRoles";
import { cn } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";

// 1. ESQUEMA DE VALIDACIÓN ZOD
const editUserSchema = z.object({
  id: z.string(),
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  apellidos: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo electrónico no válido"),
  telefono: z
    .string()
    .min(10, "Mínimo 10 dígitos")
    .optional()
    .or(z.literal("")),
  puesto: z.string().min(2, "Especifica el puesto"),
  rol: z.string().min(1, "Selecciona un rol"),
  estado: z.string().min(1, "Selecciona un estado"),
  twoFactorEnabled: z.boolean().default(false),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .optional()
    .or(z.literal("")),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

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
  password?: string;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (data: any, avatarFile?: File) => Promise<void> | void;
}

export function EditUserModal({
  open,
  onOpenChange,
  user,
  onSave,
}: EditUserModalProps) {
  const { roles } = useRoles();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [showReset2FADialog, setShowReset2FADialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();

  // 2. CONFIGURACIÓN DE REACT HOOK FORM
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  const formData = watch();

  useEffect(() => {
    if (user && open) {
      // 1. Cargamos datos base
      reset({
        ...user,
        password: user.password || "",
      });
      setSelectedFile(undefined);
      setActiveTab("general");

      // 2. Traemos el usuario individual
      const fetchFreshUser = async () => {
        try {
          const { data } = await axiosClient.get(`/api/auth/${user.id}`);
          if (data && data.password) {
            setValue("password", data.password);
          }
        } catch (error) {
          console.error("Error al refrescar contraseña", error);
        }
      };
      fetchFreshUser();
    }
  }, [user, open, reset, setValue]);

  const handleReset2FA = () => {
    setValue("twoFactorEnabled", false);
    setShowReset2FADialog(false);
    toast.success("2FA reseteado (Guarda cambios para aplicar)");
  };

  const handleFormSubmit = async (data: EditUserFormData) => {
    setIsSaving(true);
    try {
      const { password, ...userData } = data;
      const payloadToSave: any = { ...userData };
      if (password && password.trim() !== "") {
        payloadToSave.password = password;
      }
      await onSave(payloadToSave, selectedFile);
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al intentar guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;
  const initials = `${formData.nombre?.charAt(0) || ""}${formData.apellidos?.charAt(0) || ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20">
              <Edit className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Editar Usuario
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Panel de Control de Perfil
              </p>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 min-h-0 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto bg-muted/30 dark:bg-transparent custom-scrollbar">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="px-6 sm:px-8 pt-6">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl border border-border backdrop-blur-md">
                  <TabsTrigger
                    value="general"
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground"
                  >
                    <User className="h-3.5 w-3.5" /> General
                  </TabsTrigger>
                  <TabsTrigger
                    value="seguridad"
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground"
                  >
                    <Lock className="h-3.5 w-3.5" /> Seguridad
                  </TabsTrigger>
                  <TabsTrigger
                    value="imagen"
                    className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Imagen
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 sm:px-8 py-6 space-y-8">
                <TabsContent
                  value="general"
                  className="space-y-8 m-0 animate-in fade-in slide-in-from-left-2"
                >
                  {/* TARJETA: Datos Personales */}
                  <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          Nombre
                        </Label>
                        <Input
                          {...register("nombre")}
                          className={cn(
                            "h-11 shadow-sm font-bold uppercase",
                            errors.nombre &&
                              "border-brand-red/50 bg-destructive/5",
                          )}
                        />
                        {errors.nombre && (
                          <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                            {errors.nombre.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          Apellidos
                        </Label>
                        <Input
                          {...register("apellidos")}
                          className={cn(
                            "h-11 shadow-sm font-bold uppercase",
                            errors.apellidos &&
                              "border-brand-red/50 bg-destructive/5",
                          )}
                        />
                        {errors.apellidos && (
                          <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                            {errors.apellidos.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label variant="brand" required>
                        Correo Electrónico
                      </Label>
                      <Input
                        {...register("email")}
                        className={cn(
                          "h-11 shadow-sm font-bold",
                          errors.email &&
                            "border-brand-red/50 bg-destructive/5",
                        )}
                      />
                      {errors.email && (
                        <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label variant="brand">Teléfono</Label>
                        <Input
                          {...register("telefono")}
                          className="h-11 shadow-sm font-mono uppercase font-bold tracking-widest"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          Puesto
                        </Label>
                        <Input
                          {...register("puesto")}
                          className="h-11 shadow-sm font-bold uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TARJETA: Rol y Estado */}
                  <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          Rol
                        </Label>
                        <Select
                          value={formData.rol}
                          onValueChange={(v) => setValue("rol", v)}
                        >
                          <SelectTrigger className="h-11 shadow-sm font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                            {(Array.isArray(roles) ? roles : []).map((rol) => (
                              <SelectItem
                                key={rol.id}
                                value={rol.id.toString()}
                              >
                                {rol.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label variant="brand" required>
                          Estado Cuenta
                        </Label>
                        <Select
                          value={formData.estado}
                          onValueChange={(v) => setValue("estado", v)}
                        >
                          <SelectTrigger className="h-11 shadow-sm font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                            <SelectItem
                              value="activo"
                              className="text-emerald-600 font-bold"
                            >
                              Activo
                            </SelectItem>
                            <SelectItem
                              value="inactivo"
                              className="text-muted-foreground font-bold"
                            >
                              Inactivo
                            </SelectItem>
                            <SelectItem
                              value="bloqueado"
                              className="text-destructive font-bold"
                            >
                              Bloqueado
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="seguridad"
                  className="space-y-8 m-0 animate-in fade-in slide-in-from-right-2"
                >
                  {/* TARJETA: Contraseña */}
                  <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4">
                    <div className="space-y-2">
                      <Label variant="brand" className="text-destructive">
                        Contraseña (Editable)
                      </Label>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                        * Puedes ver o modificar la contraseña actual
                      </p>

                      <PasswordInput
                        value={formData.password || ""}
                        onChange={(v) =>
                          setValue("password", v, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        placeholder="••••••••"
                      />

                      {errors.password && (
                        <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* TARJETA: 2FA */}
                  <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-foreground">
                          Autenticación 2FA
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">
                          Seguridad de doble factor
                        </p>
                      </div>
                      <Switch
                        checked={formData.twoFactorEnabled}
                        onCheckedChange={(v) =>
                          setValue("twoFactorEnabled", v, { shouldDirty: true })
                        }
                      />
                    </div>

                    {/* ESCENARIO 1: YA CONFIGURADO (Botón Resetear) */}
                    {(user as any).is2FAConfigured &&
                      formData.twoFactorEnabled && (
                        <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
                          <div className="flex items-start gap-4">
                            <ShieldOff className="h-10 w-10 text-destructive bg-destructive/10 p-2 rounded-xl shrink-0" />
                            <div className="flex-1">
                              <Label className="text-sm font-black text-destructive">
                                Resetear 2FA
                              </Label>
                              <p className="text-[10px] text-destructive/60 font-bold uppercase mt-1">
                                Dispositivo actual vinculado
                              </p>
                              <AlertDialog
                                open={showReset2FADialog}
                                onOpenChange={setShowReset2FADialog}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3 font-black text-[9px]"
                                  >
                                    Resetear Ahora
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="...">
                                  {/* ... (Contenido del Reset Alert) */}
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* ESCENARIO 2: CONFIGURACIÓN PENDIENTE (Nuevo switch prendido) */}
                    {!(user as any).is2FAConfigured &&
                      formData.twoFactorEnabled && (
                        <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20">
                          <div className="flex items-start gap-3">
                            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <Label className="text-sm font-black text-blue-800 dark:text-blue-300">
                                Configuración Delegada
                              </Label>
                              <p className="text-xs text-blue-700/80 dark:text-blue-200/70 leading-relaxed mt-1.5">
                                <b>Requerimiento de seguridad activado.</b> Al
                                siguiente inicio de sesión, el sistema obligará
                                a<b> {formData.nombre}</b> a escanear su código
                                QR único para vincular su dispositivo antes de
                                entrar al sistema.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="imagen"
                  className="py-8 m-0 animate-in zoom-in-95"
                >
                  <div className="p-5 border border-border rounded-2xl bg-card shadow-sm">
                    <div className="flex justify-center">
                      <ImageUpload
                        value={user.avatar}
                        onChange={(file) => setSelectedFile(file)}
                        fallback={initials}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

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
                className="w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white bg-emerald-600 hover:bg-emerald-600/80 shadow-lg shadow-emerald-500/20 font-black uppercase tracking-widest text-[10px]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
