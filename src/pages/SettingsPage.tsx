// src/pages/SettingsPage.tsx
import { useState, useEffect, useMemo } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAdminActions } from "@/hooks/useAdminActions";
import { cn } from "@/lib/utils";

import { TiposUnidadConfig } from "@/features/configuracion/TiposUnidadConfig";
import { SatCatalogsConfig } from "@/features/configuracion/SatCatalogsConfig";
import { TiposLicenciaConfig } from "@/features/configuracion/TiposLicenciaConfig";
import { ConceptosPagoConfig } from "@/features/configuracion/ConceptosPagoConfig";
import { AseguradorasConfig } from "@/features/configuracion/AseguradorasConfig";
import { SatStampsConfig } from "@/features/configuracion/SatStampsConfig";

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
  FileSignature,
  FileCheck,
  Layers,
  Tags,
  ShieldCheck,
  FileText,
  Info,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { SystemConfig } from "@/types/api.types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ConfigCategory =
  | "empresa"
  | "operacion"
  | "facturacion"
  | "notificaciones"
  | "catalogos";
type Environment = "PROD" | "QA";

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
    id: "facturacion",
    label: "Facturación (SAT)",
    icon: FileSignature,
    description: "Certificados, Leyendas y Catálogos",
  },
  {
    id: "catalogos",
    label: "Catálogos Internos",
    icon: Layers,
    description: "Unidades, Licencias y Finanzas",
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: Bell,
    description: "Canales de alerta",
  },
];

const LEYENDA_DEFAULT = `Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS...`;

const DEFAULT_CONFIGS: SystemConfig[] = [
  {
    key: "empresa_nombre",
    value: "ESCUELA KEMPER URGATE SA DE CV",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_rfc",
    value: "EKU9003173C9",
    grupo: "empresa",
    tipo: "string",
    is_public: true,
  },
  {
    key: "empresa_regimen_fiscal",
    value: "622",
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
    key: "empresa_cp",
    value: "91808",
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
    value: "contacto@kemper.edu.mx",
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
  {
    key: "sat_leyenda_legal",
    value: LEYENDA_DEFAULT,
    grupo: "facturacion",
    tipo: "string",
    is_public: false,
  },
];

const CONFIG_METADATA: Record<string, any> = {
  empresa_nombre: {
    label: "Razón Social",
    description: "Nombre legal completo como aparece en la constancia fiscal.",
    required: true,
  },
  empresa_rfc: {
    label: "RFC",
    description: "Registro Federal de Contribuyentes (12 o 13 caracteres).",
    required: true,
    pattern: /^[A-ZÑ&]{3,4}\d{6}[A-V1-9][A-Z\d][0-9A]$/,
    errorMsg: "RFC inválido. Formato: XXX(X)YYMMDD###",
  },
  empresa_regimen_fiscal: {
    label: "Régimen Fiscal",
    description: "Clave del régimen fiscal ante el SAT.",
    required: true,
    options: [
      { label: "601 - General de Ley Personas Morales", value: "601" },
      { label: "603 - Personas Morales con Fines no Lucrativos", value: "603" },
      {
        label: "612 - Personas Físicas con Actividades Empresariales",
        value: "612",
      },
      {
        label: "626 - Régimen Simplificado de Confianza (RESICO)",
        value: "626",
      },
      {
        label: "622 - Actividades Agrícolas, Silvícolas y Pesqueras",
        value: "622",
      },
    ],
  },
  moneda_base: {
    label: "Moneda Base",
    description: "Moneda principal de la cuenta.",
    options: [
      { label: "MXN - Pesos Mexicanos", value: "MXN" },
      { label: "USD - Dólares Americanos", value: "USD" },
    ],
  },
  empresa_cp: {
    label: "Código Postal",
    description: "Lugar de expedición requerido para CFDI 4.0.",
    required: true,
    pattern: /^\d{5}$/,
    errorMsg: "Debe ser de 5 dígitos.",
  },
  empresa_email: {
    label: "Correo Electrónico",
    description: "Email principal para notificaciones de facturación.",
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMsg: "Correo electrónico no válido.",
  },
  iva_porcentaje: {
    label: "Tasa de IVA",
    description: "Porcentaje general aplicado (16% por defecto).",
    required: true,
  },
  sat_leyenda_legal: {
    label: "Cláusulas Legales",
    description: "Texto que aparecerá en el reverso de la Carta Porte.",
    required: true,
  },
  retencion_porcentaje: {
    label: "Retención de IVA",
    description:
      "Porcentaje de retención para servicios de flete (típicamente 4%).",
  },
  dias_credito_default: { label: "Días de Crédito", description: "" },
  rendimiento_diesel_esperado: {
    label: "Rendimiento Esperado",
    description: "",
  },
  tolerancia_diesel_pct: { label: "Tolerancia", description: "" },
};

const SettingsPage = () => {
  const { systemConfigs, isLoading, updateBulkSystemConfig, refreshData } =
    useAdminActions();
  const [activeCategory, setActiveCategory] =
    useState<ConfigCategory>("empresa");
  const [localConfig, setLocalConfig] = useState<SystemConfig[]>([]);
  const [environment, setEnvironment] = useState<Environment>("PROD");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const suffix = environment === "QA" ? "_qa" : "";

    const mergedConfigs = DEFAULT_CONFIGS.map((defaultConf) => {
      const targetKey = `${defaultConf.key}${suffix}`;
      const dbConf = systemConfigs?.find((c) => c.key === targetKey);
      return {
        ...defaultConf,
        key: defaultConf.key,
        value:
          dbConf && dbConf.value !== null && dbConf.value !== ""
            ? dbConf.value
            : defaultConf.value,
      };
    });

    setLocalConfig(mergedConfigs);

    const dbLogo = systemConfigs?.find((c) => c.key === "empresa_logo")?.value;
    if (dbLogo) {
      setLogoPreview(dbLogo);
    }
  }, [systemConfigs, environment]);

  const configByGroup = localConfig.filter((c) => c.grupo === activeCategory);
  const logoConfig = systemConfigs?.find((c) => c.key === "empresa_logo");

  const handleConfigChange = (key: string, value: string) => {
    setLocalConfig((prev) => {
      const exists = prev.find((c) => c.key === key);
      if (!exists)
        return [
          ...prev,
          {
            key,
            value,
            grupo: activeCategory,
            tipo: "string",
            is_public: false,
          },
        ];
      return prev.map((c) => (c.key === key ? { ...c, value } : c));
    });
  };

  const handleSaveAll = async () => {
    try {
      const suffix = environment === "QA" ? "_qa" : "";
      const payload = localConfig.map((config) => ({
        key: `${config.key}${suffix}`,
        value: String(config.value),
      }));
      if (
        logoPreview &&
        logoPreview !== logoConfig?.value &&
        environment === "PROD"
      ) {
        payload.push({ key: "empresa_logo", value: logoPreview });
      }
      await updateBulkSystemConfig(payload);
      toast.success(`Configuración de ${environment} guardada`);
    } catch (error) {
      toast.error("Error al guardar los cambios");
    }
  };

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

  const errors = useMemo(() => {
    const newErrors: Record<string, string> = {};
    localConfig.forEach((config) => {
      const meta = CONFIG_METADATA[config.key];
      if (!meta) return;
      if (
        meta.required &&
        (!config.value || String(config.value).trim() === "")
      ) {
        newErrors[config.key] = "Este campo es obligatorio.";
      } else if (meta.pattern && !meta.pattern.test(String(config.value))) {
        newErrors[config.key] = meta.errorMsg || "Formato inválido.";
      }
    });
    return newErrors;
  }, [localConfig]);

  const isFormInvalid = Object.keys(errors).length > 0;

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
    if (k.includes("direccion") || k.includes("rfc") || k.includes("cp"))
      return MapPin;
    if (k.includes("url") || k.includes("sitio")) return Globe;
    return Server;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Configuración del Sistema"
        description="Administra los parámetros globales de la plataforma"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center border border-slate-200 shadow-inner">
            <Button
              type="button"
              variant={environment === "PROD" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-lg font-bold transition-all",
                environment === "PROD" && "bg-brand-navy text-white shadow-md",
              )}
              onClick={() => setEnvironment("PROD")}
            >
              <Server className="h-4 w-4 mr-2" /> Producción
            </Button>
            <Button
              type="button"
              variant={environment === "QA" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-lg font-bold transition-all",
                environment === "QA" &&
                  "bg-amber-500 text-white hover:bg-amber-600 shadow-md",
              )}
              onClick={() => setEnvironment("QA")}
            >
              <FlaskConical className="h-4 w-4 mr-2" /> Sandbox (QA)
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isLoading || isFormInvalid}
            className={cn(
              "text-white gap-2 rounded-xl h-10 px-6 shadow-md transition-all",
              isFormInvalid
                ? "bg-slate-300 cursor-not-allowed opacity-70"
                : environment === "QA"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-brand-navy hover:bg-brand-navy/90",
            )}
          >
            {isFormInvalid ? (
              <>
                <AlertTriangle className="h-4 w-4" /> Corregir Errores
              </>
            ) : (
              <>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}{" "}
                Guardar en {environment}
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all border",
                  activeCategory === cat.id
                    ? "bg-brand-navy text-primary shadow-lg border-brand-navy"
                    : "bg-primary/5 hover:bg-slate-50 border-primary text-slate-600",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      activeCategory === cat.id
                        ? "text-emerald-400"
                        : "text-brand-navy",
                    )}
                  />
                  <div>
                    <p className="font-bold text-sm">{cat.label}</p>
                    <p
                      className={cn(
                        "text-[10px]",
                        activeCategory === cat.id
                          ? "text-primary"
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

        <Card className="flex-1 overflow-hidden rounded-2xl border-slate-200 shadow-sm relative">
          {environment === "QA" && (
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 z-50"></div>
          )}
          <ScrollArea className="h-full">
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* EMPRESA & OPERACIÓN */}
              {(activeCategory === "empresa" ||
                activeCategory === "operacion") && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {activeCategory === "empresa" && (
                    <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden rounded-3xl">
                      <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                          <div className="relative group">
                            <div
                              className={cn(
                                "h-32 w-32 rounded-3xl border-4 flex items-center justify-center bg-white shadow-xl transition-all overflow-hidden",
                                !logoPreview
                                  ? "border-dashed border-slate-200"
                                  : "border-warning",
                              )}
                            >
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Logo"
                                  className="h-full w-full object-contain p-4"
                                />
                              ) : (
                                <Building2 className="h-12 w-12 text-slate-600" />
                              )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 bg-brand-navy text-secondary p-2.5 rounded-2xl cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">
                              <Upload className="h-4 w-4 text-primary" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                              />
                            </label>
                          </div>
                          <div className="flex-1 text-center md:text-left space-y-2">
                            <Badge
                              variant="outline"
                              className="bg-white/50 text-brand-navy border-brand-navy/20 mb-1"
                            >
                              Branding Oficial
                            </Badge>
                            <h3 className="text-xl font-black text-slate-800">
                              Logotipo de la Empresa
                            </h3>
                            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                              Este archivo se utilizará para membretar tus
                              Cartas Porte, Facturas y Reportes. Se recomienda
                              un archivo **PNG transparente** de al menos 500px.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {configByGroup
                      .filter((c) => c.key !== "sat_leyenda_legal")
                      .map((config) => {
                        const Icon = getConfigIcon(config.key);
                        const meta = CONFIG_METADATA[config.key] || {
                          label: config.key.replace(/_/g, " "),
                          description: "",
                        };
                        const hasError = !!errors[config.key];
                        const isPercentage =
                          config.key.includes("porcentaje") ||
                          config.key.includes("pct");

                        return (
                          <div key={config.key} className="space-y-2.5 group">
                            <div className="flex items-center justify-between">
                              <Label
                                className={cn(
                                  "text-[11px] font-black uppercase tracking-wider transition-colors",
                                  hasError
                                    ? "text-red-500"
                                    : "text-slate-500 group-focus-within:text-brand-navy",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <Icon className="h-3.5 w-3.5" /> {meta.label}{" "}
                                  {CONFIG_METADATA[config.key]?.required && (
                                    <span className="text-red-400">*</span>
                                  )}
                                </span>
                              </Label>
                              {hasError && (
                                <span className="text-[10px] font-bold text-red-500 animate-pulse flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />{" "}
                                  {errors[config.key]}
                                </span>
                              )}
                            </div>

                            {config.tipo === "boolean" ? (
                              <div
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-2xl border transition-all bg-white shadow-sm",
                                  config.value === "true"
                                    ? "border-emerald-100 bg-emerald-50/20"
                                    : "border-slate-100",
                                )}
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-700">
                                    Estado:{" "}
                                    {config.value === "true"
                                      ? "Activo"
                                      : "Inactivo"}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {meta.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={config.value === "true"}
                                  onCheckedChange={(v) =>
                                    handleConfigChange(config.key, String(v))
                                  }
                                />
                              </div>
                            ) : meta.options ? (
                              <div className="relative group">
                                <select
                                  value={config.value}
                                  onChange={(e) =>
                                    handleConfigChange(
                                      config.key,
                                      e.target.value,
                                    )
                                  }
                                  className={cn(
                                    "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer focus:ring-4",
                                    hasError
                                      ? "border-red-300 bg-red-50/30 focus:ring-red-100"
                                      : "focus:border-brand-navy focus:ring-brand-navy/5 group-hover:border-slate-300",
                                  )}
                                >
                                  <option value="" disabled>
                                    Selecciona una opción...
                                  </option>
                                  {meta.options.map((opt: any) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                  <svg
                                    className="h-4 w-4 fill-current"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div className="relative group">
                                <Input
                                  type={
                                    config.tipo === "number" ? "number" : "text"
                                  }
                                  value={config.value}
                                  placeholder={`Escribe ${meta.label.toLowerCase()}...`}
                                  onChange={(e) => {
                                    let val = e.target.value;
                                    if (config.key.includes("rfc"))
                                      val = val.toUpperCase();
                                    handleConfigChange(config.key, val);
                                  }}
                                  className={cn(
                                    "h-12 rounded-2xl border-slate-200 bg-white px-4 font-semibold text-slate-700 transition-all focus:ring-4",
                                    hasError
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/30"
                                      : "focus:border-brand-navy focus:ring-brand-navy/5 group-hover:border-slate-300",
                                  )}
                                />
                                {isPercentage && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                                    <Separator
                                      orientation="vertical"
                                      className="h-4 mr-1"
                                    />
                                    <Percent className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            )}
                            {!hasError && meta.description && (
                              <p className="text-[10px] text-slate-400 px-1 mt-1 font-medium flex items-center gap-1">
                                <Info className="h-3 w-3" /> {meta.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* FACTURACIÓN SAT */}
              {activeCategory === "facturacion" && (
                <div className="space-y-6 w-full animate-in fade-in duration-300">
                  <h3 className="text-lg font-black text-brand-navy flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-emerald-600" />{" "}
                    Facturación SAT y Complementos
                  </h3>
                  <Tabs defaultValue="sellos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-slate-100 p-1.5 rounded-xl shadow-inner mb-6">
                      <TabsTrigger
                        value="sellos"
                        className="rounded-lg font-bold text-xs gap-2"
                      >
                        <ShieldCheck className="h-4 w-4 hidden sm:block" />{" "}
                        Sellos CSD
                      </TabsTrigger>
                      <TabsTrigger
                        value="catalogo"
                        className="rounded-lg font-bold text-xs gap-2"
                      >
                        <Tags className="h-4 w-4 hidden sm:block" /> Catálogo
                        ProdServ
                      </TabsTrigger>
                      <TabsTrigger
                        value="leyenda"
                        className="rounded-lg font-bold text-xs gap-2"
                      >
                        <FileText className="h-4 w-4 hidden sm:block" />{" "}
                        Leyendas y Contratos
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="sellos"
                      className="space-y-6 animate-in fade-in"
                    >
                      <SatStampsConfig
                        environment={environment}
                        systemConfigs={systemConfigs}
                        onRefresh={refreshData}
                      />
                    </TabsContent>
                    <TabsContent
                      value="catalogo"
                      className="space-y-6 animate-in fade-in"
                    >
                      <SatCatalogsConfig />
                    </TabsContent>
                    <TabsContent
                      value="leyenda"
                      className="space-y-4 animate-in fade-in"
                    >
                      <Textarea
                        value={
                          localConfig.find((c) => c.key === "sat_leyenda_legal")
                            ?.value || ""
                        }
                        onChange={(e) =>
                          handleConfigChange(
                            "sat_leyenda_legal",
                            e.target.value,
                          )
                        }
                        className="min-h-[400px] font-mono text-[11px] bg-slate-50 p-4 rounded-xl"
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* CATÁLOGOS INTERNOS */}
              {activeCategory === "catalogos" && (
                <div className="space-y-6 w-full animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-lg font-black text-brand-navy flex items-center gap-2">
                      <Layers className="h-5 w-5 text-emerald-600" /> Catálogos
                      Maestros
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Gestiona la base de datos de vehículos, requisitos de
                      operadores y conceptos financieros.
                    </p>
                  </div>
                  <Tabs defaultValue="unidades" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto bg-slate-100 p-1.5 rounded-xl shadow-inner mb-6">
                      <TabsTrigger
                        value="unidades"
                        className="font-bold text-xs gap-2 py-2.5"
                      >
                        <Truck className="h-4 w-4" /> Unidades
                      </TabsTrigger>
                      <TabsTrigger
                        value="licencias"
                        className="font-bold text-xs gap-2 py-2.5"
                      >
                        <FileCheck className="h-4 w-4" /> Licencias
                      </TabsTrigger>
                      <TabsTrigger
                        value="conceptos"
                        className="font-bold text-xs gap-2 py-2.5"
                      >
                        <DollarSign className="h-4 w-4" /> Conceptos
                      </TabsTrigger>
                      <TabsTrigger
                        value="aseguradoras"
                        className="font-bold text-xs gap-2 py-2.5"
                      >
                        <ShieldCheck className="h-4 w-4" /> Aseguradoras
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="unidades"
                      className="animate-in fade-in"
                    >
                      <TiposUnidadConfig />
                    </TabsContent>
                    <TabsContent
                      value="licencias"
                      className="animate-in fade-in"
                    >
                      <TiposLicenciaConfig />
                    </TabsContent>
                    <TabsContent
                      value="conceptos"
                      className="animate-in fade-in"
                    >
                      <ConceptosPagoConfig />
                    </TabsContent>
                    <TabsContent
                      value="aseguradoras"
                      className="animate-in fade-in"
                    >
                      <AseguradorasConfig />
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* NOTIFICACIONES */}
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
                        de los viajes.
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
