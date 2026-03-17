import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminActions } from "@/hooks/useAdminActions";
import { cn } from "@/lib/utils";
import { TiposUnidadConfig } from "@/features/configuracion/TiposUnidadConfig";
import { RutasAutorizadasConfig } from "@/features/configuracion/RutasAutorizadasConfig";
import {
  Building2,
  Settings2,
  Bell,
  Save,
  Loader2,
  Mail,
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
  Truck,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { SystemConfig } from "@/types/api.types";

type ConfigCategory = "empresa" | "operacion" | "notificaciones" | "catalogos";

const categories: {
  id: ConfigCategory;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    description: "Datos fiscales y corporativos",
  },
  {
    id: "operacion",
    label: "Operación",
    icon: Settings2,
    description: "Parámetros operativos",
  },
  {
    id: "catalogos",
    label: "Catálogos",
    icon: Truck,
    description: "Tipos de unidad y rutas",
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: Bell,
    description: "Canales de alerta",
  },
];

const SettingsPage = () => {
  const {
    systemConfigs, // 🚀 Viene del hook real
    isLoading,
    updateSystemConfig, // 🚀 Función para guardar uno por uno
  } = useAdminActions();

  const [activeCategory, setActiveCategory] =
    useState<ConfigCategory>("empresa");
  const [localConfig, setLocalConfig] = useState<SystemConfig[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // 🔄 Sincronizar estado local cuando carguen los datos del backend
  useEffect(() => {
    if (systemConfigs.length > 0) {
      setLocalConfig(systemConfigs);
    }
  }, [systemConfigs]);

  // Filtrar configs por el grupo actual (antes categoria)
  const configByGroup = localConfig.filter((c) => c.grupo === activeCategory);

  const handleConfigChange = (key: string, value: string) => {
    setLocalConfig((prev) =>
      prev.map((c) => (c.key === key ? { ...c, value } : c)),
    );
  };

  const handleSaveAll = async () => {
    try {
      // Guardamos las configuraciones que han cambiado
      const promises = localConfig.map((config) =>
        updateSystemConfig(config.key, config.value),
      );
      await Promise.all(promises);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      toast.error("Error al guardar algunos cambios");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        toast.info("Vista previa cargada", {
          description: "Recuerda guardar los cambios.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const getConfigIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("moneda") || k.includes("currency")) return DollarSign;
    if (k.includes("iva") || k.includes("tax") || k.includes("porcentaje"))
      return Percent;
    if (k.includes("dias") || k.includes("days") || k.includes("vence"))
      return Calendar;
    if (k.includes("combustible") || k.includes("fuel")) return Fuel;
    if (k.includes("alerta") || k.includes("alert")) return AlertTriangle;
    if (k.includes("mail") || k.includes("smtp")) return Mail;
    if (k.includes("key") || k.includes("token") || k.includes("api"))
      return Key;
    if (k.includes("direccion") || k.includes("address")) return MapPin;
    if (k.includes("url") || k.includes("sitio")) return Globe;
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
          className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-2 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Cambios
        </Button>
      </PageHeader>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all border",
                  activeCategory === cat.id
                    ? "bg-brand-navy text-white shadow-lg border-brand-navy"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      activeCategory === cat.id
                        ? "text-white"
                        : "text-brand-navy",
                    )}
                  />
                  <div>
                    <p className="font-bold text-sm">{cat.label}</p>
                    <p
                      className={cn(
                        "text-[10px]",
                        activeCategory === cat.id
                          ? "text-white/70"
                          : "text-slate-400",
                      )}
                    >
                      {cat.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <Card className="flex-1 overflow-hidden rounded-2xl border-slate-200 shadow-sm">
          <ScrollArea className="h-full">
            <CardContent className="p-8 space-y-8">
              {/* Sección Empresa: Logo Especial */}
              {activeCategory === "empresa" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Identidad Visual
                    </Label>
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          asChild
                        >
                          <label className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" /> Actualizar Logo
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </Button>
                        <p className="text-[10px] text-slate-400">
                          Recomendado: PNG Transparente 512x512px
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </div>
              )}

              {/* Renderizado Dinámico de Configuraciones (Empresa y Operación) */}
              {(activeCategory === "empresa" ||
                activeCategory === "operacion") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {configByGroup.map((config) => {
                    const Icon = getConfigIcon(config.key);

                    return (
                      <div
                        key={config.key}
                        className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 font-bold text-slate-700">
                            <Icon className="h-4 w-4 text-brand-navy" />
                            {config.key.replace(/_/g, " ").toUpperCase()}
                          </Label>
                          {config.is_public && (
                            <Badge variant="secondary" className="text-[9px]">
                              Público
                            </Badge>
                          )}
                        </div>

                        {/* Manejo de tipos de input según la base de datos */}
                        {config.tipo === "boolean" ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={config.value === "true"}
                              onCheckedChange={(checked) =>
                                handleConfigChange(config.key, String(checked))
                              }
                            />
                            <span className="text-xs text-slate-500">
                              {config.value === "true"
                                ? "Activado"
                                : "Desactivado"}
                            </span>
                          </div>
                        ) : config.tipo === "number" ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={config.value}
                              onChange={(e) =>
                                handleConfigChange(config.key, e.target.value)
                              }
                              className="rounded-lg border-slate-200 focus:ring-brand-navy"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              NUM
                            </span>
                          </div>
                        ) : (
                          <Input
                            value={config.value}
                            onChange={(e) =>
                              handleConfigChange(config.key, e.target.value)
                            }
                            className="rounded-lg border-slate-200 focus:ring-brand-navy"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sección Catálogos (Componentes especializados) */}
              {activeCategory === "catalogos" && (
                <div className="space-y-8">
                  <TiposUnidadConfig />
                  <Separator />
                  <RutasAutorizadasConfig />
                </div>
              )}

              {/* Sección Notificaciones (Simplificada) */}
              {activeCategory === "notificaciones" && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800">
                      Las notificaciones se envían automáticamente según las
                      reglas de negocio establecidas. Asegúrate de tener
                      configurado el servidor SMTP en la sección de Operación.
                    </p>
                  </div>
                  {/* Aquí iría el mapeo de localNotifications si decides implementarlo en el backend */}
                  <p className="text-sm text-slate-400 text-center py-10">
                    Módulo de gestión de canales en desarrollo...
                  </p>
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
