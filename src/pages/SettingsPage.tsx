import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminActions } from '@/hooks/useAdminActions';
import { cn } from '@/lib/utils';
import {
  Building2,
  Settings2,
  Bell,
  Puzzle,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Smartphone,
  Upload,
  MapPin,
  DollarSign,
  Percent,
  Calendar,
  Fuel,
  AlertTriangle,
  Server,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';

type ConfigCategory = 'empresa' | 'operacion' | 'notificaciones' | 'integraciones';

const categories: { id: ConfigCategory; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'empresa', label: 'Empresa', icon: Building2, description: 'Datos fiscales y corporativos' },
  { id: 'operacion', label: 'Operación', icon: Settings2, description: 'Parámetros operativos del sistema' },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell, description: 'Canales y eventos de alerta' },
  { id: 'integraciones', label: 'Integraciones', icon: Puzzle, description: 'APIs y servicios externos' },
];

const SettingsPage = () => {
  const { 
    systemConfig, 
    notificationEvents, 
    isLoading, 
    saveAllSystemConfig,
    updateNotificationEvent 
  } = useAdminActions();
  
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('empresa');
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [localNotifications, setLocalNotifications] = useState(notificationEvents);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const configByCategory = localConfig.filter(c => c.categoria === activeCategory);

  const handleConfigChange = (id: string, valor: string) => {
    setLocalConfig(prev => prev.map(c => c.id === id ? { ...c, valor } : c));
  };

  const handleNotificationChange = (id: string, canal: 'email' | 'push' | 'whatsapp', checked: boolean) => {
    setLocalNotifications(prev => prev.map(n => 
      n.id === id 
        ? { ...n, canales: { ...n.canales, [canal]: checked } }
        : n
    ));
  };

  const handleSaveAll = async () => {
    await saveAllSystemConfig(localConfig);
    // Also save notifications
    for (const notif of localNotifications) {
      await updateNotificationEvent(notif.id, notif.canales);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        toast.success('Logo cargado', { description: 'Guarda los cambios para aplicar.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getConfigIcon = (clave: string) => {
    if (clave.includes('moneda')) return DollarSign;
    if (clave.includes('iva') || clave.includes('porcentaje')) return Percent;
    if (clave.includes('dias')) return Calendar;
    if (clave.includes('combustible') || clave.includes('tolerancia')) return Fuel;
    if (clave.includes('alerta')) return AlertTriangle;
    if (clave.includes('smtp') || clave.includes('email')) return Mail;
    if (clave.includes('api') || clave.includes('key') || clave.includes('token')) return Key;
    if (clave.includes('direccion')) return MapPin;
    return Server;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Configuración del Sistema"
        description="Administra los parámetros globales de la plataforma"
      >
        <Button 
          onClick={handleSaveAll}
          disabled={isLoading}
          className="bg-action hover:bg-action-hover text-action-foreground gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Todo
        </Button>
      </PageHeader>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Sidebar Categories */}
        <div className="w-64 space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left p-4 rounded-lg transition-all",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card hover:bg-muted border"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{cat.label}</p>
                    <p className={cn(
                      "text-xs",
                      activeCategory === cat.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {cat.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="bg-primary">
            <CardTitle className="text-primary-foreground flex items-center gap-2">
              {categories.find(c => c.id === activeCategory)?.icon && (
                (() => {
                  const Icon = categories.find(c => c.id === activeCategory)!.icon;
                  return <Icon className="h-5 w-5" />;
                })()
              )}
              {categories.find(c => c.id === activeCategory)?.label}
            </CardTitle>
            <CardDescription className="text-primary-foreground/70">
              {categories.find(c => c.id === activeCategory)?.description}
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="h-[calc(100%-80px)]">
            <CardContent className="p-6 space-y-6">
              {/* Empresa Section */}
              {activeCategory === 'empresa' && (
                <>
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>Logo de la Empresa</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" asChild>
                          <label className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Logo
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </Button>
                        <p className="text-xs text-muted-foreground">PNG o JPG, máximo 2MB</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  
                  {/* Company Fields */}
                  {configByCategory.map((config) => {
                    const Icon = getConfigIcon(config.clave);
                    return (
                      <div key={config.id} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {config.descripcion}
                        </Label>
                        <Input
                          value={config.valor}
                          onChange={(e) => handleConfigChange(config.id, e.target.value)}
                          placeholder={config.descripcion}
                        />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Operación Section */}
              {activeCategory === 'operacion' && (
                <div className="grid grid-cols-2 gap-6">
                  {configByCategory.map((config) => {
                    const Icon = getConfigIcon(config.clave);
                    return (
                      <div key={config.id} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {config.descripcion}
                        </Label>
                        {config.tipo === 'select' && config.opciones ? (
                          <Select 
                            value={config.valor} 
                            onValueChange={(v) => handleConfigChange(config.id, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {config.opciones.map(op => (
                                <SelectItem key={op} value={op}>{op}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : config.tipo === 'number' ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={config.valor}
                              onChange={(e) => handleConfigChange(config.id, e.target.value)}
                              className="pr-10"
                            />
                            {config.clave.includes('porcentaje') || config.clave.includes('tolerancia') ? (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            ) : config.clave.includes('dias') ? (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">días</span>
                            ) : null}
                          </div>
                        ) : (
                          <Input
                            value={config.valor}
                            onChange={(e) => handleConfigChange(config.id, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notificaciones Section */}
              {activeCategory === 'notificaciones' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                    <div className="col-span-1">
                      <p className="text-sm font-medium text-muted-foreground">Evento</p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">Push</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </div>
                  </div>
                  
                  {localNotifications.map((event) => (
                    <div key={event.id} className="grid grid-cols-4 gap-4 py-3 border-b last:border-0">
                      <div className="col-span-1">
                        <p className="font-medium text-sm">{event.nombre}</p>
                        <p className="text-xs text-muted-foreground">{event.descripcion}</p>
                      </div>
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={event.canales.email}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(event.id, 'email', checked as boolean)
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={event.canales.push}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(event.id, 'push', checked as boolean)
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={event.canales.whatsapp}
                          onCheckedChange={(checked) => 
                            handleNotificationChange(event.id, 'whatsapp', checked as boolean)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Integraciones Section */}
              {activeCategory === 'integraciones' && (
                <div className="space-y-6">
                  {configByCategory.map((config) => {
                    const Icon = getConfigIcon(config.clave);
                    const isPassword = config.tipo === 'password';
                    const showPassword = showPasswords[config.id];
                    
                    return (
                      <div key={config.id} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {config.descripcion}
                        </Label>
                        <div className="relative">
                          <Input
                            type={isPassword && !showPassword ? 'password' : 'text'}
                            value={config.valor}
                            onChange={(e) => handleConfigChange(config.id, e.target.value)}
                            placeholder={isPassword ? '••••••••••••••••' : config.descripcion}
                            className="pr-10"
                          />
                          {isPassword && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => togglePasswordVisibility(config.id)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <Separator className="my-6" />
                  
                  <div className="p-4 bg-status-info-bg rounded-lg">
                    <p className="text-sm text-status-info font-medium mb-1">💡 Nota de Seguridad</p>
                    <p className="text-xs text-muted-foreground">
                      Las API Keys y tokens se almacenan de forma encriptada. 
                      Nunca compartas estas credenciales con terceros.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
