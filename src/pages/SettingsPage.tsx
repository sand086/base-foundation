// src/pages/SettingsPage.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea"; // 🚀 IMPORTANTE: Asegúrate de tener este componente
import { useAdminActions } from "@/hooks/useAdminActions";
import { cn } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";

import { TiposUnidadConfig } from "@/features/configuracion/TiposUnidadConfig";
import { RutasAutorizadasConfig } from "@/features/configuracion/RutasAutorizadasConfig";
import { SatCatalogsConfig } from "@/features/configuracion/SatCatalogsConfig";

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
  Eye,
  EyeOff,
  CheckCircle2,
  Download,
  Lock,
  Tags,
  ShieldCheck,
  FileText,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SystemConfig } from "@/types/api.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ConfigCategory =
  | "empresa"
  | "operacion"
  | "facturacion"
  | "notificaciones"
  | "catalogos";

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

// 🚀 LEYENDA LEGAL EXTRAÍDA DEL OCR DE RAPID-3T
const LEYENDA_DEFAULT = `Condiciones de prestación de servicios que ampara la CARTA DE PORTE O COMPROBANTE PARA EL TRANSPORTE DE MERCANCÍAS. PRIMERA.- Para los efectos del presente contrato de transporte se denomina 'Transportista' al que realiza el servicio de transportación y 'Remitente' o 'Expedidor' al usuario que contrate el servicio o remite la mercancía. SEGUNDA.- El 'Remitente' o 'Expedidor' es responsable de que la información proporcionada al 'Transportista' sea veraz y que la documentación que entregue para efectos del transporte sea la correcta. TERCERA.- El 'Remitente' o 'Expedidor' debe declarar al 'Transportista' el tipo de mercancía o efectos de que se trate, peso, medidas y/o número de la carga que entrega para su transporte y, en su caso, el valor de la misma. La carga que se entregue a granel será pesada por el 'Transportista' en el primer punto donde haya báscula apropiada o, en su defecto, aforada en metros cúbicos con la conformidad del 'Remitente' o 'Expedidor'. CUARTA.- Para efectos del transporte, el 'Remitente' o 'Expedidor' deberá entregar al 'Transportista' los documentos que las leyes y reglamentos exijan para llevar a cabo el servicio, en caso de no cumplirse con estos requisitos el 'Transportista' está obligado a rehusar el transporte de las mercancías. QUINTA.- Si por sospecha de falsedad en la declaración del contenido de un bulto el 'Transportista' deseare proceder a su reconocimiento, podrá hacerlo ante testigos y con asistencia del 'Remitente' o 'Expedidor' o del consignatario. Si este último no concurriere, se solicitará la presencia de un inspector de la Secretaría de Comunicaciones y Transportes, y se levantará el acta correspondiente. El 'Transportista' tendrá en todo caso, la obligación de dejar los bultos en el estado en que se encontraban antes del reconocimiento. SEXTA.- El 'Transportista' deberá recoger y entregar la carga precisamente en los domicilios que señale el 'Remitente' o 'Expedidor' ajustándose a los términos y condiciones convenidos. El 'Transportista' sólo está obligado a llevar la carga al domicilio del consignatario para su entrega una sola vez. Si ésta no fuera recibida se dejará aviso de que la mercancía queda a disposición del interesado en las bodegas que indique el 'Transportista'. SÉPTIMA.- Si la carga no fuere retirada dentro de los 30 días hábiles siguientes a aquél en que hubiere sido puesta a disposición del consignatario, el 'Transportista' podrá solicitar la venta en subasta pública con arreglo a lo que dispone el Código de Comercio. OCTAVA.- El 'Transportista' y el 'Remitente' o 'Expedidor' negociarán libremente el precio del servicio, tomando en cuenta su tipo, característica de los embarques, volumen, regularidad, clase de carga y sistema de pago. NOVENA.- Si el 'Remitente' o 'Expedidor' desea que el 'Transportista' asuma la responsabilidad por el valor de las mercancías o efectos que él declare y que cubra toda clase de riesgos, inclusive los derivados de caso fortuito o de fuerza mayor, las partes deberán convenir un cargo adicional, equivalente al valor de la prima del seguro que se contrate, el cual se deberá expresar en la Carta de Porte. DÉCIMA.- Cuando el importe del flete no incluya el cargo adicional, la responsabilidad del 'Transportista' queda expresamente limitada a la cantidad equivalente a 15 días del salario mínimo vigente en el Distrito Federal por tonelada o cuando se trate de embarques cuyo peso sea mayor de 200 kg., pero menor de 1000 kg; y a 4 días de salario mínimo por remesa cuando se trate de embarques con peso hasta de 200 kg. DÉCIMA PRIMERA.- El precio del transporte deberá pagarse en origen, salvo convenio entre las partes de pago en destino. Cuando el transporte se hubiere concertado 'Flete por Cobrar' la entrega de las mercancías o efectos se hará contra el pago del flete y el 'Transportista' tendrá derecho a retenerlos mientras no se le cubra el precio convenido. DÉCIMA SEGUNDA.- Si al momento de la entrega resultare algún faltante o avería, el consignatario deberá hacerla constar en ese acto en la Carta de Porte y formular su reclamación por escrito al 'Transportista' dentro de las 24 horas siguientes. DÉCIMA TERCERA.- El 'Transportista' queda eximido de la obligación de recibir mercancías o efectos para su transporte, en los siguientes casos: a) Cuando se trate de carga que por su naturaleza, peso, volumen, embalaje defectuoso o cualquier otra circunstancia no pueda transportarse sin destruirse o sin causar daño a los demás artículos o al material rodante, salvo que la empresa de que se trate tenga el equipo adecuado. b) Las mercancías cuyo transporte haya sido prohibido por disposiciones legales o reglamentarias. Cuando tales disposiciones no prohíban precisamente el transporte de determinadas mercancías, pero sí ordenen la presentación de ciertos documentos para que puedan ser transportadas, el 'Remitente' o 'Expedidor' estará obligado a entregar al 'Transportista' los documentos correspondientes. DÉCIMA CUARTA.- Los casos no previstos en las presentes condiciones y las quejas derivadas de su aplicación se someterán por la vía administrativa a la Secretaría de Comunicaciones y Transportes. DÉCIMA QUINTA.- Para el caso de que el 'Remitente' o 'Expedidor' contrate carro por entero, este aceptará la responsabilidad solidaria para con el 'Transportista' mediante la figura de la corresponsabilidad que contempla el artículo 10 del Reglamento Sobre el Peso, Dimensiones y Capacidad de los Vehículos de Autotransporte que Transitan en los Caminos y Puentes de Jurisdicción Federal, por lo que el 'Remitente' o 'Expedidor' queda obligado a verificar que la carga y el vehículo que la transporta, cumplan con el peso y dimensiones máximas establecidos en la NOM-012-SCT-2-2014. Para el caso de incumplimiento e inobservancia a las disposiciones que regulan el peso y dimensiones, por parte del 'Remitente' o 'Expedidor', este será corresponsable de las infracciones y multas que la Secretaría de Comunicaciones y Transportes y la Policía Federal impongan al 'Transportista' por cargar las unidades con exceso de peso.`;

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
  // 🚀 INCLUIMOS LA LEYENDA COMO CONFIGURACIÓN POR DEFECTO
  {
    key: "sat_leyenda_legal",
    value: LEYENDA_DEFAULT,
    grupo: "facturacion",
    tipo: "string",
    is_public: false,
  },
];

const SettingsPage = () => {
  const { systemConfigs, isLoading, updateBulkSystemConfig } =
    useAdminActions();

  const [activeCategory, setActiveCategory] =
    useState<ConfigCategory>("empresa");
  const [localConfig, setLocalConfig] = useState<SystemConfig[]>([]);

  // ESTADOS PARA SUBIR CSD
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [csdPassword, setCsdPassword] = useState("");
  const [isUploadingCsd, setIsUploadingCsd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Referencias para inputs de archivo ocultos (Solución al bug del Finder)
  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // ESTADOS PARA DESCARGA SEGURA DE CSD
  const [downloadModal, setDownloadModal] = useState<{
    open: boolean;
    type: "cer" | "key" | null;
  }>({ open: false, type: null });
  const [downloadPassword, setDownloadPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadPassword, setShowDownloadPassword] = useState(false);

  const savedCsdInfo = useMemo(() => {
    if (!systemConfigs) return null;
    const cerPath = systemConfigs.find((c) => c.key === "sat_cert_path")?.value;
    const keyPath = systemConfigs.find((c) => c.key === "sat_key_path")?.value;
    const pass = systemConfigs.find((c) => c.key === "sat_key_password")?.value;

    if (!cerPath || !keyPath) return null;

    const cerName =
      cerPath.split("/").pop()?.split("\\").pop() || "Certificado.cer";
    const keyName = keyPath.split("/").pop()?.split("\\").pop() || "Clave.key";

    return { cerName, keyName, pass };
  }, [systemConfigs]);

  useEffect(() => {
    const mergedConfigs = DEFAULT_CONFIGS.map((defaultConf) => {
      const dbConf = systemConfigs?.find((c) => c.key === defaultConf.key);
      if (dbConf) {
        return {
          ...defaultConf,
          ...dbConf,
          value:
            dbConf.value !== null && dbConf.value !== ""
              ? dbConf.value
              : defaultConf.value,
          grupo: dbConf.grupo || defaultConf.grupo,
          tipo: dbConf.tipo || defaultConf.tipo,
        };
      }
      return defaultConf;
    });

    const extraDbConfigs = (systemConfigs || []).filter(
      (c) =>
        !DEFAULT_CONFIGS.some((dc) => dc.key === c.key) &&
        c.key !== "modules_list" &&
        c.key !== "empresa_logo" &&
        !c.key.includes("sat_key_password") &&
        !c.key.includes("sat_cert_path") &&
        !c.key.includes("sat_key_path"),
    );

    setLocalConfig([...mergedConfigs, ...extraDbConfigs]);

    // Rellenar la contraseña actual para que la vea si le da al "ojito"
    if (savedCsdInfo?.pass) {
      setCsdPassword(savedCsdInfo.pass);
    }
  }, [systemConfigs, savedCsdInfo]);

  const configByGroup = localConfig.filter((c) => c.grupo === activeCategory);
  const logoConfig = systemConfigs?.find((c) => c.key === "empresa_logo");
  const [logoPreview, setLogoPreview] = useState<string | null>(
    logoConfig?.value || null,
  );

  const handleConfigChange = (key: string, value: string) => {
    setLocalConfig((prev) => {
      // Si la key no existe en prev (porque no vino de la BD ni de DEFAULT), la añadimos
      const exists = prev.find((c) => c.key === key);
      if (!exists) {
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
      }
      return prev.map((c) => (c.key === key ? { ...c, value } : c));
    });
  };

  const handleSaveAll = async () => {
    try {
      const payload = localConfig.map((config) => ({
        key: config.key,
        value: String(config.value),
      }));
      if (logoPreview && logoPreview !== logoConfig?.value) {
        payload.push({ key: "empresa_logo", value: logoPreview });
      }
      await updateBulkSystemConfig(payload);
      toast.success("Configuración guardada", {
        description: "Los parámetros han sido aplicados en el sistema.",
      });
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

  const handleUploadCsd = async () => {
    if (!cerFile || !keyFile || !csdPassword) {
      toast.error("Faltan archivos o contraseña", {
        description:
          "Debes adjuntar el archivo .CER, el archivo .KEY y escribir la clave privada.",
      });
      return;
    }

    setIsUploadingCsd(true);
    const formData = new FormData();
    formData.append("cer_file", cerFile);
    formData.append("key_file", keyFile);
    formData.append("password", csdPassword);

    try {
      await axiosClient.post("/billing/csd", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Certificados Actualizados", {
        description: "Los archivos se guardaron y están listos para timbrar.",
      });
      setCerFile(null);
      setKeyFile(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error("Error al subir los certificados", {
        description:
          error.response?.data?.detail ||
          "Verifica los archivos e intenta de nuevo.",
      });
    } finally {
      setIsUploadingCsd(false);
    }
  };

  const handleDownloadCsdSecure = async () => {
    if (!downloadPassword || !downloadModal.type) return;

    setIsDownloading(true);
    const formData = new FormData();
    formData.append("password", downloadPassword);
    formData.append("file_type", downloadModal.type);

    try {
      const response = await axiosClient.post(
        "/billing/csd/download",
        formData,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const extension = downloadModal.type === "cer" ? ".cer" : ".key";
      link.setAttribute("download", `Certificado_SAT_Respaldo${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        `Archivo ${extension.toUpperCase()} descargado por seguridad.`,
      );
      setDownloadModal({ open: false, type: null });
      setDownloadPassword("");
    } catch (error: any) {
      toast.error("Acceso Denegado", {
        description:
          error.response?.status === 401
            ? "La contraseña ingresada es incorrecta."
            : "Ocurrió un error al descargar el archivo.",
      });
    } finally {
      setIsDownloading(false);
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
          type="button"
          onClick={handleSaveAll}
          disabled={isLoading}
          className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-2 rounded-xl h-11 px-6 shadow-md"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}{" "}
          Guardar Cambios Generales
        </Button>
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
                    ? "bg-brand-navy text-white shadow-lg border-brand-navy"
                    : "bg-primary/5 hover:bg-slate-50 border-slate-200 text-slate-600",
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
                          ? "text-slate-300"
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

        <Card className="flex-1 overflow-hidden rounded-2xl border-slate-200 shadow-sm">
          <ScrollArea className="h-full">
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* SECCIÓN EMPRESA */}
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
                          type="button"
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

              {/* Renderizado Dinámico para Empresa y Operación */}
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
                            <Icon className="h-4 w-4 text-brand-navy" />{" "}
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

              {/* 🚀 NUEVA SECCIÓN: FACTURACIÓN SAT (3 PESTAÑAS INTERNAS) */}
              {activeCategory === "facturacion" && (
                <div className="space-y-6 w-full animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-lg font-black text-brand-navy flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-emerald-600" />
                      Facturación SAT y Complementos
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Configura tus certificados, catálogos y términos legales
                      para la emisión de CFDI y Carta Porte.
                    </p>
                  </div>

                  <Tabs defaultValue="sellos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-slate-100 p-1.5 rounded-xl shadow-inner mb-6">
                      <TabsTrigger
                        value="sellos"
                        type="button" // Previene el bug del form/finder
                        className="rounded-lg font-bold text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy"
                      >
                        <ShieldCheck className="h-4 w-4 hidden sm:block" />{" "}
                        Sellos CSD
                      </TabsTrigger>
                      <TabsTrigger
                        value="catalogo"
                        type="button" // Previene el bug del form/finder
                        className="rounded-lg font-bold text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy"
                      >
                        <Tags className="h-4 w-4 hidden sm:block" /> Catálogo
                        ProdServ
                      </TabsTrigger>
                      <TabsTrigger
                        value="leyenda"
                        type="button" // Previene el bug del form/finder
                        className="rounded-lg font-bold text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-brand-navy"
                      >
                        <FileText className="h-4 w-4 hidden sm:block" />{" "}
                        Leyendas y Contratos
                      </TabsTrigger>
                    </TabsList>

                    {/* SUB-PESTAÑA 1: SELLOS CSD */}
                    <TabsContent
                      value="sellos"
                      className="space-y-6 animate-in fade-in"
                    >
                      {savedCsdInfo && (
                        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                          <div className="w-full">
                            <h4 className="text-sm font-bold text-emerald-800 mb-2">
                              Certificados Activos en el Servidor
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-4 text-xs font-mono text-emerald-700">
                              <div className="flex items-center justify-between bg-white border border-emerald-100 rounded px-3 py-2 w-full sm:w-1/2">
                                <span className="truncate pr-2">
                                  <b className="text-emerald-900">CER:</b>{" "}
                                  {savedCsdInfo.cerName}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-emerald-100 hover:text-emerald-800 shrink-0"
                                  onClick={() =>
                                    setDownloadModal({
                                      open: true,
                                      type: "cer",
                                    })
                                  }
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between bg-white border border-emerald-100 rounded px-3 py-2 w-full sm:w-1/2">
                                <span className="truncate pr-2">
                                  <b className="text-emerald-900">KEY:</b>{" "}
                                  {savedCsdInfo.keyName}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-emerald-100 hover:text-emerald-800 shrink-0"
                                  onClick={() =>
                                    setDownloadModal({
                                      open: true,
                                      type: "key",
                                    })
                                  }
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* SUBIR CER (Usando Ref para aislar el evento de click) */}
                          <div className="space-y-3">
                            <Label className="font-bold text-slate-700">
                              Reemplazar Certificado (.CER) *
                            </Label>
                            <div
                              onClick={() =>
                                !cerFile && cerInputRef.current?.click()
                              }
                              className={cn(
                                "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors bg-white",
                                cerFile
                                  ? "border-emerald-400 bg-emerald-50/30"
                                  : "border-slate-300 hover:border-brand-navy cursor-pointer",
                              )}
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept=".cer"
                                ref={cerInputRef}
                                onChange={(e) =>
                                  setCerFile(e.target.files?.[0] || null)
                                }
                              />
                              {cerFile ? (
                                <>
                                  <FileCheck className="h-8 w-8 text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">
                                    {cerFile.name}
                                  </p>
                                  <p
                                    className="text-[10px] text-slate-500 cursor-pointer mt-1 hover:underline relative z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCerFile(null);
                                      if (cerInputRef.current)
                                        cerInputRef.current.value = "";
                                    }}
                                  >
                                    Remover
                                  </p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                                  <p className="text-xs text-slate-500 font-medium">
                                    Haz click para subir nuevo
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* SUBIR KEY (Usando Ref para aislar el evento de click) */}
                          <div className="space-y-3">
                            <Label className="font-bold text-slate-700">
                              Reemplazar Clave (.KEY) *
                            </Label>
                            <div
                              onClick={() =>
                                !keyFile && keyInputRef.current?.click()
                              }
                              className={cn(
                                "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors bg-white",
                                keyFile
                                  ? "border-emerald-400 bg-emerald-50/30"
                                  : "border-slate-300 hover:border-brand-navy cursor-pointer",
                              )}
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept=".key"
                                ref={keyInputRef}
                                onChange={(e) =>
                                  setKeyFile(e.target.files?.[0] || null)
                                }
                              />
                              {keyFile ? (
                                <>
                                  <FileCheck className="h-8 w-8 text-emerald-500 mb-2" />
                                  <p className="text-xs font-bold text-emerald-700">
                                    {keyFile.name}
                                  </p>
                                  <p
                                    className="text-[10px] text-slate-500 cursor-pointer mt-1 hover:underline relative z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setKeyFile(null);
                                      if (keyInputRef.current)
                                        keyInputRef.current.value = "";
                                    }}
                                  >
                                    Remover
                                  </p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                                  <p className="text-xs text-slate-500 font-medium">
                                    Haz click para subir nuevo
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200 md:col-span-2">
                          <Label className="font-bold text-slate-700">
                            Contraseña de la Clave Privada *
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={csdPassword}
                              onChange={(e) => setCsdPassword(e.target.value)}
                              placeholder="Escribe la contraseña..."
                              className="h-11 bg-white border-slate-300 font-mono pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">
                            Atención: Esta clave es requerida para poder emitir
                            los timbres en cada viaje.
                          </p>
                        </div>

                        <Button
                          type="button"
                          className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-bold h-12 rounded-xl shadow-md md:col-span-2"
                          disabled={
                            isUploadingCsd ||
                            !cerFile ||
                            !keyFile ||
                            !csdPassword
                          }
                          onClick={handleUploadCsd}
                        >
                          {isUploadingCsd ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-5 w-5 mr-2" />
                          )}
                          {isUploadingCsd
                            ? "Subiendo archivos y asegurando..."
                            : "Actualizar Certificados SAT en Servidor"}
                        </Button>
                      </div>
                    </TabsContent>

                    {/* SUB-PESTAÑA 2: CATÁLOGO PRODSERV */}
                    <TabsContent
                      value="catalogo"
                      className="space-y-6 animate-in fade-in"
                    >
                      <SatCatalogsConfig />
                    </TabsContent>

                    {/* SUB-PESTAÑA 3: DATOS COMPLEMENTARIOS (LEYENDAS) */}
                    <TabsContent
                      value="leyenda"
                      className="space-y-4 animate-in fade-in"
                    >
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[11px] font-medium shadow-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Este texto aparecerá en el nodo de Addenda del XML y en
                        la última página de la representación impresa (PDF).
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500">
                          Contenido de Cláusulas Legales
                        </Label>
                        <Textarea
                          value={
                            localConfig.find(
                              (c) => c.key === "sat_leyenda_legal",
                            )?.value || ""
                          }
                          onChange={(e) =>
                            handleConfigChange(
                              "sat_leyenda_legal",
                              e.target.value,
                            )
                          }
                          className="min-h-[400px] font-mono text-[11px] leading-relaxed bg-slate-50 focus:bg-white transition-colors p-4 rounded-xl border-slate-200 focus:border-brand-navy"
                          placeholder="Pega aquí las cláusulas del contrato..."
                        />
                      </div>

                      <div className="flex justify-end gap-4 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            handleConfigChange(
                              "sat_leyenda_legal",
                              LEYENDA_DEFAULT,
                            )
                          }
                          className="text-slate-500 font-bold text-xs uppercase"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" /> Restablecer
                          Contrato Rapid-3T
                        </Button>
                        <p className="text-[10px] text-slate-400 italic flex items-center">
                          Haz click en "Guardar Cambios Generales" arriba para
                          aplicar.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Catálogos */}
              {activeCategory === "catalogos" && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <TiposUnidadConfig />
                  <Separator />
                  <RutasAutorizadasConfig />
                </div>
              )}

              {/* Notificaciones */}
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

      {/* MODAL DE SEGURIDAD PARA DESCARGA DE CSD */}
      <Dialog
        open={downloadModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setDownloadModal({ open: false, type: null });
            setDownloadPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-navy font-black uppercase">
              <Lock className="h-5 w-5 text-amber-500" /> Verificación de
              Seguridad
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Para descargar el archivo{" "}
              <b className="text-slate-900 uppercase">.{downloadModal.type}</b>,
              por favor ingresa la contraseña privada del sello digital.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">
                Contraseña Privada *
              </Label>
              <div className="relative">
                <Input
                  type={showDownloadPassword ? "text" : "password"}
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  placeholder="Contraseña del SAT..."
                  className="h-11 bg-slate-50 font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy"
                >
                  {showDownloadPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDownloadModal({ open: false, type: null })}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDownloadCsdSecure}
              disabled={isDownloading || !downloadPassword}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-bold"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Confirmar y Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
