import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdminActions } from '@/hooks/useAdminActions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Validation schemas
const profileSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono: z.string().min(10, 'Teléfono inválido'),
  puesto: z.string().min(2, 'Mínimo 2 caracteres'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(4, 'Mínimo 4 caracteres'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ProfilePage = () => {
  const { profile, isLoading, updateProfile, updatePassword, initiate2FA, verify2FACode, disable2FA } = useAdminActions();
  const [activeTab, setActiveTab] = useState('datos');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [emailNotifications, setEmailNotifications] = useState({
    viajes: true,
    documentos: true,
    finanzas: false,
    sistema: true,
  });
  
  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'init' | 'qr' | 'verify' | 'backup'>('init');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQRUrl, setTwoFAQRUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Forms
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre: profile.nombre,
      apellidos: profile.apellidos,
      telefono: profile.telefono,
      puesto: profile.puesto,
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    await updateProfile(data);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    const success = await updatePassword(data.currentPassword, data.newPassword);
    if (success) {
      passwordForm.reset();
    }
  };

  const handleStart2FA = async () => {
    const { secret, qrCodeUrl } = await initiate2FA();
    setTwoFASecret(secret);
    setTwoFAQRUrl(qrCodeUrl);
    setTwoFAStep('qr');
  };

  const handleVerify2FA = async () => {
    const success = await verify2FACode(verificationCode, twoFASecret);
    if (success) {
      setTwoFAStep('backup');
    }
  };

  const handleComplete2FA = () => {
    setShow2FADialog(false);
    setTwoFAStep('init');
    setVerificationCode('');
  };

  const handleDisable2FA = async () => {
    const success = await disable2FA(disablePassword);
    if (success) {
      setShowDisable2FADialog(false);
      setDisablePassword('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-status-danger-bg text-status-danger border-status-danger-border';
      case 'operativo': return 'bg-status-info-bg text-status-info border-status-info-border';
      case 'finanzas': return 'bg-status-success-bg text-status-success border-status-success-border';
      case 'supervisor': return 'bg-status-warning-bg text-status-warning border-status-warning-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      operativo: 'Operativo',
      finanzas: 'Finanzas',
      supervisor: 'Supervisor',
      taller: 'Taller',
    };
    return labels[rol] || rol;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal, seguridad y preferencias"
      />

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar} alt={profile.nombre} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.nombre.charAt(0)}{profile.apellidos.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile.nombre} {profile.apellidos}
                </h2>
                <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(profile.rol))}>
                  {getRoleLabel(profile.rol)}
                </Badge>
                {profile.twoFactorEnabled && (
                  <Badge variant="outline" className="bg-status-success-bg text-status-success border-status-success-border text-xs gap-1">
                    <Shield className="h-3 w-3" />
                    2FA
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{profile.puesto}</p>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Último acceso</p>
              <p className="font-medium text-foreground">{profile.ultimoAcceso}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3 h-10">
          <TabsTrigger value="datos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            Preferencias
          </TabsTrigger>
        </TabsList>

        {/* Tab: Datos Personales */}
        <TabsContent value="datos">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tus datos de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="pt-4">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input value={profile.email} disabled className="mt-1.5 bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">
                      El email no puede ser modificado. Contacta al administrador.
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="bg-action hover:bg-action-hover text-action-foreground">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Cambios
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seguridad */}
        <TabsContent value="seguridad" className="space-y-4">
          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña Actual</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isLoading} variant="outline">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Cambiar Contraseña
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* 2FA Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Autenticación de Dos Factores (2FA)
              </CardTitle>
              <CardDescription>
                Añade una capa extra de seguridad a tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  {profile.twoFactorEnabled ? (
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
                      {profile.twoFactorEnabled ? '2FA Activado' : '2FA No Configurado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.twoFactorEnabled 
                        ? `Método: App de Autenticación (${profile.twoFactorMethod?.toUpperCase()})`
                        : 'Protege tu cuenta con verificación en dos pasos'
                      }
                    </p>
                  </div>
                </div>
                {profile.twoFactorEnabled ? (
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
                      setTwoFAStep('init');
                    }}
                    className="bg-action hover:bg-action-hover text-action-foreground"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Configurar 2FA
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preferencias */}
        <TabsContent value="preferencias" className="space-y-4">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Tema de la Aplicación</CardTitle>
              <CardDescription>Selecciona tu preferencia de visualización</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', icon: Sun, label: 'Claro' },
                  { value: 'dark', icon: Moon, label: 'Oscuro' },
                  { value: 'system', icon: Monitor, label: 'Sistema' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value as typeof theme)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                      theme === value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-8 w-8",
                      theme === value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      theme === value ? "text-primary" : "text-foreground"
                    )}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notificaciones por Email
              </CardTitle>
              <CardDescription>Configura qué notificaciones deseas recibir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'viajes', label: 'Viajes y Operaciones', desc: 'Actualizaciones de viajes, retrasos y entregas' },
                { key: 'documentos', label: 'Documentos y Vencimientos', desc: 'Alertas de licencias, seguros y verificaciones' },
                { key: 'finanzas', label: 'Finanzas y Facturación', desc: 'Facturas, pagos y estados de cuenta' },
                { key: 'sistema', label: 'Sistema y Seguridad', desc: 'Inicios de sesión y cambios de configuración' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications[key as keyof typeof emailNotifications]}
                    onCheckedChange={(checked) => 
                      setEmailNotifications(prev => ({ ...prev, [key]: checked }))
                    }
                    className="data-[state=checked]:bg-action"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configurar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              {twoFAStep === 'init' && 'Añade seguridad extra con tu app de autenticación favorita'}
              {twoFAStep === 'qr' && 'Escanea el código QR con tu aplicación de autenticación'}
              {twoFAStep === 'verify' && 'Ingresa el código de verificación de tu aplicación'}
              {twoFAStep === 'backup' && 'Guarda tu clave secreta en un lugar seguro'}
            </DialogDescription>
          </DialogHeader>

          {twoFAStep === 'init' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Apps compatibles:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Google Authenticator</li>
                  <li>• Microsoft Authenticator</li>
                  <li>• Authy</li>
                  <li>• 1Password</li>
                </ul>
              </div>
              <Button 
                onClick={handleStart2FA} 
                className="w-full bg-action hover:bg-action-hover text-action-foreground"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Generar Código QR
              </Button>
            </div>
          )}

          {twoFAStep === 'qr' && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={twoFAQRUrl} 
                  alt="QR Code for 2FA" 
                  className="w-48 h-48"
                />
              </div>
              <div className="space-y-2">
                <Label>¿No puedes escanear? Ingresa esta clave manualmente:</Label>
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
              <Button 
                onClick={() => setTwoFAStep('verify')} 
                className="w-full"
              >
                Siguiente
              </Button>
            </div>
          )}

          {twoFAStep === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código de Verificación (6 dígitos)</Label>
                <Input 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Verificar y Activar
              </Button>
            </div>
          )}

          {twoFAStep === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-status-success-bg rounded-lg text-center">
                <CheckCircle2 className="h-12 w-12 text-status-success mx-auto mb-2" />
                <p className="font-medium text-status-success">¡2FA Activado Exitosamente!</p>
              </div>
              <div className="p-4 bg-status-warning-bg rounded-lg">
                <p className="text-sm text-status-warning font-medium mb-2">
                  ⚠️ Guarda esta clave de respaldo:
                </p>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Si pierdes acceso a tu app, necesitarás esta clave.
                </p>
              </div>
              <Button onClick={handleComplete2FA} className="w-full">
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desactivar 2FA
            </DialogTitle>
            <DialogDescription>
              Esta acción reducirá la seguridad de tu cuenta. Ingresa tu contraseña para confirmar.
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
            <Button variant="outline" onClick={() => setShowDisable2FADialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisable2FA}
              disabled={!disablePassword || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
