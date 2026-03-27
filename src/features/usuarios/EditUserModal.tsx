import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PasswordInput } from "@/components/usuarios/PasswordInput";
import { ImageUpload } from "@/components/usuarios/ImageUpload";
import {
  Edit,
  User,
  Lock,
  Image as ImageIcon,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

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

  // 🚀 TRUCO DE DEBUG: Ver errores en consola si el botón no responde
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("⚠️ Errores de Validación:", errors);
    }
  }, [errors]);

  useEffect(() => {
    if (user && open) {
      reset({
        ...user,
        password: "",
      });
      setSelectedFile(undefined);
      setActiveTab("general");
    }
  }, [user, open, reset]);

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
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER NAVY TAHOE */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <Edit className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                Editar Usuario
              </DialogTitle>
              <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-[0.3em] mt-1">
                Panel de Control de Perfil
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* IMPORTANTE: El onSubmit usa handleSubmit de react-hook-form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="bg-white/40 backdrop-blur-sm"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="px-8 pt-6">
              <TabsList className="grid w-full grid-cols-3 bg-slate-900/5 p-1 rounded-xl border border-slate-200/50 backdrop-blur-md">
                <TabsTrigger
                  value="general"
                  className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-brand-navy"
                >
                  <User className="h-3.5 w-3.5" /> General
                </TabsTrigger>
                <TabsTrigger
                  value="seguridad"
                  className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-brand-navy"
                >
                  <Lock className="h-3.5 w-3.5" /> Seguridad
                </TabsTrigger>
                <TabsTrigger
                  value="imagen"
                  className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-brand-navy"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Imagen
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-8 py-6 min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar">
              <TabsContent
                value="general"
                className="space-y-6 m-0 animate-in fade-in slide-in-from-left-2"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      Nombre
                    </Label>
                    <Input
                      {...register("nombre")}
                      className={cn(
                        "h-11 glass-card",
                        errors.nombre && "border-brand-red/50 bg-destructive/5",
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
                        "h-11 glass-card",
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
                      "h-11 glass-card font-bold text-brand-navy",
                      errors.email && "border-brand-red/50",
                    )}
                  />
                  {errors.email && (
                    <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label variant="brand">Teléfono</Label>
                    <Input
                      {...register("telefono")}
                      className="h-11 glass-card font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      Puesto
                    </Label>
                    <Input
                      {...register("puesto")}
                      className="h-11 glass-card"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label variant="brand" required>
                      Rol
                    </Label>
                    <Select
                      value={formData.rol}
                      onValueChange={(v) => setValue("rol", v)}
                    >
                      <SelectTrigger className="h-11 glass-card font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        {roles.map((rol) => (
                          <SelectItem key={rol.id} value={rol.id.toString()}>
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
                      <SelectTrigger className="h-11 glass-card font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        <SelectItem
                          value="activo"
                          className="text-emerald-600 font-bold"
                        >
                          Activo
                        </SelectItem>
                        <SelectItem
                          value="inactivo"
                          className="text-slate-400 font-bold"
                        >
                          Inactivo
                        </SelectItem>
                        <SelectItem
                          value="bloqueado"
                          className="text-rose-600 font-bold"
                        >
                          Bloqueado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="seguridad"
                className="space-y-6 m-0 animate-in fade-in slide-in-from-right-2"
              >
                <div className="space-y-2">
                  <Label variant="brand" className="text-brand-red">
                    Nueva Contraseña
                  </Label>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                    * Vacío para mantener actual
                  </p>
                  <PasswordInput
                    value={formData.password}
                    onChange={(v) => setValue("password", v)}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-brand-red text-[9px] font-black uppercase mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl glass-card border-slate-200">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-brand-navy">
                      Autenticación 2FA
                    </Label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Seguridad de doble factor
                    </p>
                  </div>
                  <Switch
                    checked={formData.twoFactorEnabled}
                    onCheckedChange={(v) => setValue("twoFactorEnabled", v)}
                  />
                </div>

                {formData.twoFactorEnabled && (
                  <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
                    <div className="flex items-start gap-4">
                      <ShieldOff className="h-10 w-10 text-destructive bg-destructive/10 p-2 rounded-xl" />
                      <div className="flex-1">
                        <Label className="text-sm font-black text-destructive">
                          Resetear 2FA
                        </Label>
                        <p className="text-[10px] text-destructive/60 font-bold uppercase mt-1">
                          Acción crítica para dispositivos perdidos
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
                              className="mt-3 h-8 font-black uppercase text-[9px] tracking-widest shadow-lg"
                            >
                              Resetear Ahora
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-panel border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="heading-crisp text-xl text-brand-navy">
                                ¿Confirmar Reseteo?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                Esto desconectará el 2FA de {formData.nombre}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-bold text-xs uppercase">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleReset2FA}
                                className="bg-destructive hover:bg-destructive/90 font-bold text-xs uppercase"
                              >
                                Sí, Resetear
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="imagen"
                className="py-8 m-0 animate-in zoom-in-95"
              >
                <div className="flex justify-center">
                  <ImageUpload
                    value={user.avatar}
                    onChange={(file) => setSelectedFile(file)}
                    fallback={initials}
                  />
                </div>
              </TabsContent>
            </div>

            <div className="px-8 py-6 border-t border-white/20 bg-white/60 backdrop-blur-xl flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 font-black uppercase text-[11px] tracking-widest text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="btn-primary-gradient h-11 px-10 font-black uppercase text-[11px] tracking-[0.2em] shadow-lg active:scale-95"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Guardar Cambios
              </Button>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
