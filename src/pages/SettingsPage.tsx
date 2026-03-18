import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminActions } from "@/hooks/useAdminActions";
import { cn } from "@/lib/utils";

// Asumiendo que estos componentes ya los tienes funcionales
import { TiposUnidadConfig } from "@/features/configuracion/TiposUnidadConfig";
import { RutasAutorizadasConfig } from "@/features/configuracion/RutasAutorizadasConfig";

import {
  Building2,
  Settings2,
  Bell,
  Save,
  Loader2,
  Mail,
  Upload,
  MapPin,
  DollarSign,
  Percent,
  Calendar,
  Fuel,
  AlertTriangle,
  Server,
  Key,
  Globe,
  Truck,
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

// 🚀 1. LISTA DE CONFIGURACIONES POR DEFECTO
// Esto asegura que los campos siempre existan, aunque la BD esté vacía
const DEFAULT_CONFIGS: SystemConfig[] = [
  {
    key: "empresa_nombre",
    value: "Transportes TMS",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_rfc",
    value: "XAXX010101000",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_direccion",
    value: "Ciudad de México",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_telefono",
    value: "555-123-4567",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_email",
    value: "contacto@empresa.com",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "moneda_base",
    value: "MXN",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },

  {
    key: "iva_porcentaje",
    value: "16",
    grupo: "operacion",
    tipo: "number",
    is_public: false,
  },
  {
    key: "retencion_porcentaje",
    value: "4",
    grupo: "operacion",
    tipo: "number",
    is_public: false,
  },
  {
    key: "dias_credito_default",
    value: "15",
    grupo: "operacion",
    tipo: "number",
    is_public: false,
  },
  {
    key: "rendimiento_diesel_esperado",
    value: "3.2",
    grupo: "operacion",
    tipo: "number",
    is_public: false,
  },
  {
    key: "tolerancia_diesel_pct",
    value: "0.05",
    grupo: "operacion",
    tipo: "number",
    is_public: false,
  },
];

const SettingsPage = () => {
  const { systemConfigs, isLoading, updateSystemConfig } = useAdminActions();

  const [activeCategory, setActiveCategory] =
    useState<ConfigCategory>("empresa");
  const [localConfig, setLocalConfig] = useState<SystemConfig[]>([]);

  // 🚀 2. MEZCLAR DATOS DE LA BD CON LOS DEFAULT
  useEffect(() => {
    // Si la BD tiene datos, los usamos. Si le faltan keys de DEFAULT_CONFIGS, las agregamos.
    const mergedConfigs = DEFAULT_CONFIGS.map((defaultConf) => {
      const dbConf = systemConfigs?.find((c) => c.key === defaultConf.key);
      return dbConf ? dbConf : defaultConf;
    });

    // Agregar configuraciones extra que vengan de la BD pero no estén en defaults (ignorando la de modulos)
    const extraDbConfigs = (systemConfigs || []).filter(
      (c) =>
        !DEFAULT_CONFIGS.some((dc) => dc.key === c.key) &&
        c.key !== "modules_list" &&
        c.key !== "empresa_logo",
    );

    setLocalConfig([...mergedConfigs, ...extraDbConfigs]);
  }, [systemConfigs]);

  const configByGroup = localConfig.filter((c) => c.grupo === activeCategory);

  // Extraer el logo (si existe en el backend)
  const logoConfig = systemConfigs?.find((c) => c.key === "empresa_logo");
  const [logoPreview, setLogoPreview] = useState<string | null>(
    logoConfig?.value || null,
  );

  const handleConfigChange = (key: string, value: string) => {
    setLocalConfig((prev) =>
      prev.map((c) => (c.key === key ? { ...c, value } : c)),
    );
  };

  const handleSaveAll = async () => {
    try {
      const promises = localConfig.map((config) =>
        updateSystemConfig(config.key, config.value),
      );

      // Guardar el logo si se subió uno nuevo
      if (logoPreview && logoPreview !== logoConfig?.value) {
        promises.push(updateSystemConfig("empresa_logo", logoPreview));
      }

      await Promise.all(promises);
      toast.success("Configuración guardada", {
        description: "Los parámetros han sido aplicados en el sistema.",
      });
    } catch (error) {
      toast.error("Error al guardar algunos cambios");
    }
  };

  // 🚀 3. MANEJO DEL LOGO (Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        toast.info("Vista previa cargada", {
          description: "No olvides darle click a 'Guardar Cambios'.",
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
    if (k.includes("combustible") || k.includes("diesel")) return Fuel;
    if (k.includes("alerta") || k.includes("alert")) return AlertTriangle;
    if (k.includes("mail") || k.includes("smtp")) return Mail;
    if (k.includes("key") || k.includes("token") || k.includes("api"))
      return Key;
    if (k.includes("direccion") || k.includes("rfc")) return MapPin;
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
          className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-2 rounded-xl h-11 px-6 shadow-md"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Cambios
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all border",
                  activeCategory === cat.id
                    ? "bg-brand-navy text-black shadow-lg border-brand-navy"
                    : "bg-primary/10 hover:bg-slate-50 border-slate-200 text-slate-600",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      activeCategory === cat.id
                        ? "text-black"
                        : "text-brand-navy",
                    )}
                  />
                  <div>
                    <p className="font-bold text-sm">{cat.label}</p>
                    <p
                      className={cn(
                        "text-[10px]",
                        activeCategory === cat.id
                          ? "text-black/70"
                          : "text-slate-500",
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
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* Sección Empresa: Logo Especial */}
              {activeCategory === "empresa" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Identidad Visual
                    </Label>
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shadow-inner">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo Empresa"
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
                          className="rounded-lg font-bold"
                          asChild
                        >
                          <label className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4 text-brand-navy" />{" "}
                            Subir Logo
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </Button>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Recomendado: PNG Transparente 512x512px
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </div>
              )}

              {/* Renderizado Dinámico (Empresa y Operación) */}
              {(activeCategory === "empresa" ||
                activeCategory === "operacion") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {configByGroup.map((config) => {
                    const Icon = getConfigIcon(config.key);
                    const isPercentage =
                      config.key.includes("porcentaje") ||
                      config.key.includes("pct");

                    return (
                      <div
                        key={config.key}
                        className="space-y-3 p-5 rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 font-bold text-slate-700 text-xs uppercase tracking-wide">
                            <Icon className="h-4 w-4 text-brand-navy" />
                            {config.key.replace(/_/g, " ")}
                          </Label>
                        </div>

                        {config.tipo === "boolean" ? (
                          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                            <Switch
                              checked={config.value === "true"}
                              onCheckedChange={(checked) =>
                                handleConfigChange(config.key, String(checked))
                              }
                            />
                            <span className="text-xs font-bold text-slate-500">
                              {config.value === "true" ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        ) : config.tipo === "number" ? (
                          <div className="relative">
                            <Input
                              type="number"
                              step={isPercentage ? "0.01" : "1"}
                              value={config.value}
                              onChange={(e) =>
                                handleConfigChange(config.key, e.target.value)
                              }
                              className="h-11 rounded-lg border-slate-200 font-mono font-bold text-slate-700 focus-visible:ring-brand-navy"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              {isPercentage ? "%" : "NUM"}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={config.value}
                            onChange={(e) =>
                              handleConfigChange(config.key, e.target.value)
                            }
                            className="h-11 rounded-lg border-slate-200 font-medium text-slate-700 focus-visible:ring-brand-navy"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sección Catálogos (Tipos de unidad, rutas, etc.) */}
              {activeCategory === "catalogos" && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <TiposUnidadConfig />
                  <Separator />
                  <RutasAutorizadasConfig />
                </div>
              )}

              {/* Sección Notificaciones */}
              {activeCategory === "notificaciones" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex gap-4 items-start shadow-sm">
                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-800 mb-1">
                        Configuración en construcción
                      </h4>
                      <p className="text-xs text-amber-700/80 leading-relaxed">
                        Las notificaciones SMS y Email se están disparando
                        automáticamente según los eventos de cambio de estatus
                        de los viajes. Pronto podrás configurar las plantillas
                        desde aquí.
                      </p>
                    </div>
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
