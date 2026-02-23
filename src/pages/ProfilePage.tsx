import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/context/AuthContext";
import axiosClient from "@/api/axiosClient";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  User,
  Shield,
  Settings,
  Camera,
  Key,
  Smartphone,
  Mail,
  Bell,
  Moon,
  Sun,
  Monitor,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  QrCode,
  RefreshCw,
  Activity,
  Eye,
  EyeOff,
  Wand2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import AvatarDefault from "@/assets/img/usuarios/avatar3.png";

// =====================
// Schemas
// =====================
const profileSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  puesto: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(4, "Mínimo 4 caracteres"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// =====================
// Types
// =====================
type ThemeMode = "light" | "dark" | "system";

type EmailNotifications = {
  viajes: boolean;
  documentos: boolean;
  finanzas: boolean;
  sistema: boolean;
};

type FullProfile = {
  id: number;
  email: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  puesto?: string | null;
  avatar_url?: string | null;
  role_id?: number | null;
  preferencias?: {
    theme?: ThemeMode;
    notifications?: boolean;
    email_notifications?: Partial<EmailNotifications>;
  } | null;
  is_2fa_enabled?: boolean | null;
  last_login?: string | null;
};

// =====================
// Helpers
// =====================
const formatDateTimeESMX = (iso?: string | null) => {
  if (!iso) return "Primer acceso";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initialsFromName = (nombre?: string, apellido?: string | null) => {
  const a = (nombre || "").trim();
  const b = (apellido || "").trim();
  const first = a ? a[0] : "U";
  const second = b ? b[0] : a.length > 1 ? a[1] : "S";
  return `${first}${second}`.toUpperCase();
};

const getRoleBadgeColor = (roleId?: number | null) => {
  switch (roleId) {
    case 1:
      return "bg-status-danger-bg text-status-danger border-status-danger-border";
    case 2:
      return "bg-status-info-bg text-status-info border-status-info-border";
    case 3:
      return "bg-status-success-bg text-status-success border-status-success-border";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getRoleLabel = (roleId?: number | null) => {
  switch (roleId) {
    case 1:
      return "Administrador";
    case 2:
      return "Operativo";
    case 3:
      return "Finanzas";
    default:
      return "Usuario Sistema";
  }
};

// --- LOGICA DE FUERZA DE CONTRASEÑA ---
const getPasswordStrength = (pass: string) => {
  if (!pass) return { label: "", color: "bg-muted", pct: 0 };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2)
    return {
      label: "Insegura",
      color: "bg-red-500",
      text: "text-red-500",
      pct: 25,
    };
  if (score === 3 || score === 4)
    return {
      label: "Regular",
      color: "bg-yellow-500",
      text: "text-yellow-500",
      pct: 50,
    };
  if (score === 5)
    return {
      label: "Buena",
      color: "bg-blue-500",
      text: "text-blue-500",
      pct: 75,
    };
  return {
    label: "Excelente",
    color: "bg-green-500",
    text: "text-green-500",
    pct: 100,
  };
};

// =====================
// Page
// =====================
const ProfilePage: React.FC = () => {
  const { user: authUser } = useAuth();

  const [fullProfile, setFullProfile] = useState<FullProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  const [activeTab, setActiveTab] = useState("datos");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para ver contraseña
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>("system");
  const [emailNotifications, setEmailNotifications] =
    useState<EmailNotifications>({
      viajes: true,
      documentos: true,
      finanzas: false,
      sistema: true,
    });

  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<
    "init" | "qr" | "verify" | "backup"
  >("init");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQRUrl, setTwoFAQRUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombre: "", apellidos: "", telefono: "", puesto: "" },
    mode: "onChange",
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Escuchamos el valor de la nueva contraseña en tiempo real para la barra de fuerza
  const newPasswordValue = passwordForm.watch("newPassword");
  const strength = getPasswordStrength(newPasswordValue);

  const fetchProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const { data } = await axiosClient.get<FullProfile>("/usuarios/me");
      setFullProfile(data);
      profileForm.reset({
        nombre: data.nombre || "",
        apellidos: data.apellido || "",
        telefono: data.telefono || "",
        puesto: data.puesto || "",
      });
      if (data.preferencias?.theme) setTheme(data.preferencias.theme);
      if (data.preferencias?.email_notifications) {
        setEmailNotifications((prev) => ({
          ...prev,
          ...data.preferencias?.email_notifications,
        }));
      }
    } catch (error) {
      toast.error("No se pudo cargar la información del perfil");
    } finally {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!fullProfile) return;
    setIsLoading(true);
    try {
      const payload = {
        nombre: data.nombre,
        apellido: data.apellidos,
        telefono: data.telefono,
        puesto: data.puesto,
      };
      await axiosClient.put(`/usuarios/${fullProfile.id}`, payload);
      setFullProfile((prev) => (prev ? { ...prev, ...payload } : prev));
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!fullProfile) return;
    setIsLoading(true);
    try {
      await axiosClient.post(`/usuarios/${fullProfile.id}/reset-password`, {
        new_password: data.newPassword,
      });
      toast.success("Contraseña actualizada con éxito");
      passwordForm.reset();
      setShowCurrentPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
    } catch (error) {
      toast.error("Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Función Generar Contraseña ---
  const handleGeneratePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generatedPass = "";
    // Aseguramos que tenga al menos una letra mayúscula, minúscula, número y símbolo
    generatedPass += "A";
    generatedPass += "a";
    generatedPass += "1";
    generatedPass += "!";
    // Rellenamos el resto hasta 16
    for (let i = 4; i < 16; i++) {
      generatedPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Mezclamos un poco (shuffle básico)
    generatedPass = generatedPass
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    passwordForm.setValue("newPassword", generatedPass, {
      shouldValidate: true,
    });
    passwordForm.setValue("confirmPassword", generatedPass, {
      shouldValidate: true,
    });

    // Mostramos la contraseña para que el usuario la vea
    setShowNewPass(true);
    setShowConfirmPass(true);

    toast.success("Contraseña segura generada");
  };

  const handleSavePreferences = async () => {
    if (!fullProfile) return;
    setIsLoading(true);
    try {
      const payload = {
        preferencias: { theme, email_notifications: emailNotifications },
      };
      await axiosClient.put(`/usuarios/${fullProfile.id}`, payload);
      setFullProfile((prev) => (prev ? { ...prev, ...payload } : prev));
      toast.success("Preferencias guardadas");
    } catch (error) {
      toast.error("No se pudieron guardar las preferencias");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart2FA = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosClient.get<{
        secret: string;
        qr_code: string;
      }>("/2fa/setup");
      setTwoFASecret(data.secret);
      setTwoFAQRUrl(data.qr_code);
      setTwoFAStep("qr");
    } catch (error) {
      toast.error("Error al iniciar 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!fullProfile) return;
    setIsLoading(true);
    try {
      await axiosClient.post("/2fa/enable", {
        code: verificationCode,
        user_id: fullProfile.id,
      });
      setTwoFAStep("backup");
      setFullProfile((prev) =>
        prev ? { ...prev, is_2fa_enabled: true } : prev,
      );
    } catch (error) {
      toast.error("Código incorrecto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete2FA = () => {
    setShow2FADialog(false);
    setTwoFAStep("init");
    setVerificationCode("");
    toast.success("2FA activado en tu cuenta");
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      toast.info("Función de desactivar 2FA pendiente de conectar al backend");
      setShowDisable2FADialog(false);
      setDisablePassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.info("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const avatarUrl = useMemo(() => {
    if (!fullProfile) return AvatarDefault;
    return fullProfile.avatar_url?.trim()
      ? fullProfile.avatar_url
      : AvatarDefault;
  }, [fullProfile]);

  const iniciales = useMemo(() => {
    if (!fullProfile) return "US";
    return initialsFromName(fullProfile.nombre, fullProfile.apellido);
  }, [fullProfile]);

  const is2faEnabled = Boolean(fullProfile?.is_2fa_enabled);
  const ultimoAccesoString = useMemo(
    () => formatDateTimeESMX(fullProfile?.last_login),
    [fullProfile?.last_login],
  );

  if (isFetchingProfile || !fullProfile) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Cargando perfil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal, seguridad y preferencias"
      />

      {/* Header Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative w-fit">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl} alt={fullProfile.nombre} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {iniciales}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow"
                onClick={() =>
                  toast.info("Subida de avatar pendiente de conectar")
                }
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground truncate">
                  {fullProfile.nombre} {fullProfile.apellido || ""}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getRoleBadgeColor(fullProfile.role_id),
                  )}
                >
                  {getRoleLabel(fullProfile.role_id)}
                </Badge>
                {is2faEnabled && (
                  <Badge
                    variant="outline"
                    className="bg-status-success-bg text-status-success border-status-success-border text-xs gap-1"
                  >
                    <Shield className="h-3 w-3" /> 2FA
                  </Badge>
                )}
              </div>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-muted-foreground truncate">
                  {fullProfile.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {fullProfile.puesto || "Sin puesto asignado"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  Último acceso:{" "}
                  <span className="font-medium text-foreground">
                    {ultimoAccesoString}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-start">
              <Button
                variant="outline"
                className="gap-2"
                onClick={fetchProfile}
                disabled={isFetchingProfile}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isFetchingProfile && "animate-spin")}
                />{" "}
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-lg grid-cols-3 h-10">
          <TabsTrigger value="datos" className="gap-2">
            <User className="h-4 w-4" /> Datos
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-2">
            <Shield className="h-4 w-4" /> Seguridad
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="gap-2">
            <Settings className="h-4 w-4" /> Preferencias
          </TabsTrigger>
        </TabsList>

        {/* ======================= DATOS ======================= */}
        <TabsContent value="datos">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tus datos de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="apellidos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellidos</FormLabel>
                          <FormControl>
                            <Input placeholder="Tus apellidos" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="+52 55 1234 5678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="puesto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puesto</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu puesto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input
                      value={fullProfile.email}
                      disabled
                      className="mt-1.5 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      El email no puede ser modificado. Contacta al
                      administrador.
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-action hover:bg-action-hover text-action-foreground"
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}{" "}
                      Guardar Cambios
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= SEGURIDAD ======================= */}
        <TabsContent value="seguridad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" /> Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña de acceso o genera una nueva ultra
                segura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-6"
                >
                  {/* Password Actual */}
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña Actual</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPass ? "text" : "password"}
                              placeholder="••••••••"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setShowCurrentPass(!showCurrentPass)
                              }
                            >
                              {showCurrentPass ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Acciones de Generador */}
                  <div className="flex items-center gap-2 py-2 bg-muted/30 p-3 rounded-lg border border-dashed">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1">
                      ¿Necesitas una contraseña fuerte?
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleGeneratePassword}
                    >
                      Generar automáticamente
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nueva Password */}
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPass ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-20"
                                {...field}
                              />

                              <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                                {newPasswordValue && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() =>
                                      copyToClipboard(newPasswordValue)
                                    }
                                    title="Copiar contraseña"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowNewPass(!showNewPass)}
                                >
                                  {showNewPass ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </FormControl>
                          {/* Medidor de Fuerza */}
                          {newPasswordValue && (
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full transition-all duration-300",
                                    strength.color,
                                  )}
                                  style={{ width: `${strength.pct}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-right text-muted-foreground font-medium">
                                Seguridad:{" "}
                                <span className={strength.text}>
                                  {strength.label}
                                </span>
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Confirmar Password */}
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPass ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setShowConfirmPass(!showConfirmPass)
                                }
                              >
                                {showConfirmPass ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      variant="outline"
                      className="gap-2"
                    >
                      {isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Key className="h-4 w-4" />
                      Actualizar Contraseña
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* 2FA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" /> Autenticación de Dos Factores
                (2FA)
              </CardTitle>
              <CardDescription>
                Añade una capa extra de seguridad a tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  {is2faEnabled ? (
                    <div className="h-12 w-12 rounded-full bg-status-success-bg flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-status-success" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-status-warning-bg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-status-warning" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {is2faEnabled ? "2FA Activado" : "2FA No Configurado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {is2faEnabled
                        ? "Método: App de autenticación"
                        : "Protege tu cuenta con verificación en dos pasos"}
                    </p>
                  </div>
                </div>
                {is2faEnabled ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisable2FADialog(true)}
                  >
                    Desactivar 2FA
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setShow2FADialog(true);
                      setTwoFAStep("init");
                    }}
                    className="bg-action hover:bg-action-hover text-action-foreground"
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Configurar 2FA
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= PREFERENCIAS ======================= */}
        <TabsContent value="preferencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema de la Aplicación</CardTitle>
              <CardDescription>
                Selecciona tu preferencia de visualización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: "light" as const, icon: Sun, label: "Claro" },
                  { value: "dark" as const, icon: Moon, label: "Oscuro" },
                  { value: "system" as const, icon: Monitor, label: "Sistema" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                      theme === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-8 w-8",
                        theme === value
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        theme === value ? "text-primary" : "text-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSavePreferences}
                  disabled={isLoading}
                  variant="outline"
                  className="gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}{" "}
                  Guardar Preferencias
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" /> Notificaciones por Email
              </CardTitle>
              <CardDescription>
                Configura qué notificaciones deseas recibir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "viajes" as const,
                  label: "Viajes y Operaciones",
                  desc: "Actualizaciones de viajes, retrasos y entregas",
                },
                {
                  key: "documentos" as const,
                  label: "Documentos y Vencimientos",
                  desc: "Alertas de licencias, seguros y verificaciones",
                },
                {
                  key: "finanzas" as const,
                  label: "Finanzas y Facturación",
                  desc: "Facturas, pagos y estados de cuenta",
                },
                {
                  key: "sistema" as const,
                  label: "Sistema y Seguridad",
                  desc: "Inicios de sesión y cambios de configuración",
                },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications[key]}
                    onCheckedChange={(checked) =>
                      setEmailNotifications((prev) => ({
                        ...prev,
                        [key]: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-action"
                  />
                </div>
              ))}
              <Separator />
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePreferences}
                  disabled={isLoading}
                  className="bg-action hover:bg-action-hover text-action-foreground gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}{" "}
                  Guardar Preferencias
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======================= MODALES 2FA ======================= */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Configurar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              {twoFAStep === "init" &&
                "Añade seguridad extra con tu app de autenticación favorita"}
              {twoFAStep === "qr" && "Escanea el código QR con tu aplicación"}
              {twoFAStep === "verify" && "Ingresa el código de verificación"}
              {twoFAStep === "backup" && "Guarda tu clave secreta"}
            </DialogDescription>
          </DialogHeader>
          {twoFAStep === "init" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Apps compatibles:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Google Authenticator</li>
                  <li>• Microsoft Authenticator</li>
                  <li>• Authy</li>
                </ul>
              </div>
              <Button
                onClick={handleStart2FA}
                className="w-full bg-action hover:bg-action-hover text-action-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}{" "}
                Generar Código QR
              </Button>
            </div>
          )}
          {twoFAStep === "qr" && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={twoFAQRUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="space-y-2">
                <Label>Clave manual:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={twoFASecret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(twoFASecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => setTwoFAStep("verify")} className="w-full">
                Siguiente
              </Button>
            </div>
          )}
          {twoFAStep === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código de Verificación</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              <Button
                onClick={handleVerify2FA}
                disabled={verificationCode.length !== 6 || isLoading}
                className="w-full bg-action hover:bg-action-hover text-action-foreground"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}{" "}
                Verificar y Activar
              </Button>
            </div>
          )}
          {twoFAStep === "backup" && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-status-success-bg rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-status-success mx-auto mb-2" />
                <p className="font-medium text-status-success">
                  ¡2FA Activado Exitosamente!
                </p>
              </div>
              <Button onClick={handleComplete2FA} className="w-full">
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDisable2FADialog}
        onOpenChange={setShowDisable2FADialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Desactivar 2FA
            </DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisable2FADialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={!disablePassword || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
