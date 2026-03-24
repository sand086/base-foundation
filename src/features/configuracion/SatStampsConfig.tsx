import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Upload,
  Key,
  CheckCircle2,
  Loader2,
  FileCheck,
  AlertCircle,
  Lock,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";
import { SystemConfig } from "@/types/api.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  environment: "PROD" | "QA";
  systemConfigs: SystemConfig[] | undefined;
  onRefresh: () => void;
}

export function SatStampsConfig({
  environment,
  systemConfigs,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [certInfo, setCertInfo] = useState<{
    valido_hasta: string;
    dias_restantes: number;
    estado: string;
  } | null>(null);

  const [files, setFiles] = useState<{ cer: File | null; key: File | null }>({
    cer: null,
    key: null,
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Estados Modal Descarga
  const [downloadModal, setDownloadModal] = useState<{
    open: boolean;
    type: "cer" | "key" | null;
  }>({ open: false, type: null });
  const [downloadPassword, setDownloadPassword] = useState("");
  const [showDownloadPassword, setShowDownloadPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 1. Detectar archivos existentes dinámicamente
  const currentStamps = useMemo(() => {
    if (!systemConfigs) return null;
    const suffix = environment === "QA" ? "_qa" : "";
    const cer = systemConfigs.find(
      (c) => c.key === `sat_cert_path${suffix}`,
    )?.value;
    const key = systemConfigs.find(
      (c) => c.key === `sat_key_path${suffix}`,
    )?.value;

    if (!cer || !key) return null;
    return {
      cerName: cer.split(/[/\\]/).pop() || "Certificado.cer",
      keyName: key.split(/[/\\]/).pop() || "Llave.key",
    };
  }, [systemConfigs, environment]);

  // 2. Subir Archivos (FormData)
  const handleUpload = async () => {
    if (!files.cer || !files.key || !password)
      return toast.error("Faltan datos obligatorios.");

    const formData = new FormData();
    formData.append("cer_file", files.cer);
    formData.append("key_file", files.key);
    formData.append("password", password);
    formData.append("environment", environment);

    setLoading(true);
    try {
      await axiosClient.post("/billing/csd", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Certificados de ${environment} actualizados`);
      setFiles({ cer: null, key: null });
      setPassword("");
      setCertInfo(null);
      onRefresh(); // Actualiza sin reload
    } catch (error: any) {
      toast.error("Error al subir certificados");
    } finally {
      setLoading(false);
    }
  };

  // 3. Descarga Segura con Contraseña
  const handleDownloadSecure = async () => {
    if (!downloadPassword || !downloadModal.type) return;

    setIsDownloading(true);
    const formData = new FormData();
    formData.append("password", downloadPassword); // <--- Esta es la de LOGUEO
    formData.append("file_type", downloadModal.type);
    formData.append("environment", environment);

    try {
      const response = await axiosClient.post(
        "/billing/csd/download",
        formData,
        { responseType: "blob" },
      );

      // Crear el link de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `CSD_${environment}.${downloadModal.type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Archivo descargado correctamente");
      setDownloadModal({ open: false, type: null });
      setDownloadPassword("");
    } catch (error: any) {
      toast.error("Verificación fallida", {
        description: "Tu contraseña de acceso es incorrecta.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 4. Probar Conexión y Ver Vencimiento
  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data } = await axiosClient.post("/billing/csd/test", {
        environment,
      });
      setCertInfo(data.cert_info);
      toast.success("Verificación de sellos completa");
    } catch (error: any) {
      toast.error("Fallo la verificación");
      setCertInfo(null);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* SECCIÓN 1: STATUS DINÁMICO */}
      {currentStamps ? (
        <div
          className={cn(
            "border p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-md transition-all",
            certInfo?.estado === "CADUCADO"
              ? "bg-red-50 border-red-200"
              : certInfo?.estado === "POR VENCER"
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50/50 border-emerald-200",
          )}
        >
          <div className="flex items-center gap-5 flex-1 w-full">
            <div
              className={cn(
                "p-4 rounded-2xl text-white shadow-lg",
                certInfo?.estado === "CADUCADO"
                  ? "bg-red-500"
                  : certInfo?.estado === "POR VENCER"
                    ? "bg-amber-500"
                    : "bg-brand-navy",
              )}
            >
              {certInfo?.estado === "CADUCADO" ? (
                <ShieldX className="h-7 w-7" />
              ) : (
                <ShieldCheck className="h-7 w-7" />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Sellos {environment} Cargados
                </h4>
                {certInfo && (
                  <Badge
                    className={cn(
                      "text-[10px] font-bold border-none",
                      certInfo.estado === "VIGENTE"
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white animate-pulse",
                    )}
                  >
                    {certInfo.estado}
                  </Badge>
                )}
              </div>

              {/* 🚀 BOTONES DE DESCARGA: DISEÑO TIPO TARJETA (MUY VISIBLES) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDownloadModal({ open: true, type: "cer" })}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-brand-navy hover:shadow-md transition-all group text-left w-full"
                >
                  <div className="bg-slate-100 p-2 rounded-lg text-brand-navy group-hover:bg-brand-navy/10">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] uppercase font-black text-slate-400">
                      Descargar Certificado
                    </p>
                    <p className="text-[10px] font-mono text-slate-600 truncate">
                      {currentStamps.cerName}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDownloadModal({ open: true, type: "key" })}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-brand-navy hover:shadow-md transition-all group text-left w-full"
                >
                  <div className="bg-slate-100 p-2 rounded-lg text-brand-navy group-hover:bg-brand-navy/10">
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] uppercase font-black text-slate-400">
                      Descargar Llave Privada
                    </p>
                    <p className="text-[10px] font-mono text-slate-600 truncate">
                      {currentStamps.keyName}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full md:w-auto rounded-xl font-bold bg-white border-slate-200 text-slate-700 shadow-sm"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Verificar Vigencia
          </Button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-center gap-4 text-amber-800">
          <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
          <div className="text-sm">
            <p className="font-black uppercase">Sin Sellos Vinculados</p>
            <p className="text-xs opacity-80">
              Sube tus archivos .cer y .key para habilitar la facturación en{" "}
              {environment}.
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: FORMULARIO */}
      <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-6">
          <CardTitle className="text-xs font-black uppercase text-brand-navy flex items-center gap-2">
            <Upload className="h-4 w-4" /> Cargar nuevos archivos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div
                onClick={() => cerInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 transition-all bg-white cursor-pointer h-24 flex flex-col items-center justify-center",
                  files.cer
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-200 hover:border-brand-navy",
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".cer"
                  ref={cerInputRef}
                  onChange={(e) =>
                    setFiles({ ...files, cer: e.target.files?.[0] || null })
                  }
                />
                {files.cer ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                    <p className="text-[10px] font-bold text-emerald-700 truncate w-full px-2 text-center">
                      {files.cer.name}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Subir .CER
                  </p>
                )}
              </div>
              <div
                onClick={() => keyInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 transition-all bg-white cursor-pointer h-24 flex flex-col items-center justify-center",
                  files.key
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-200 hover:border-brand-navy",
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".key"
                  ref={keyInputRef}
                  onChange={(e) =>
                    setFiles({ ...files, key: e.target.files?.[0] || null })
                  }
                />
                {files.key ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                    <p className="text-[10px] font-bold text-emerald-700 truncate w-full px-2 text-center">
                      {files.key.name}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Subir .KEY
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <Label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                  <Lock className="h-3 w-3" /> Contraseña SAT
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white h-11 rounded-xl"
                    placeholder="Clave privada..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={loading || !files.cer || !files.key || !password}
            className={cn(
              "w-full h-14 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl text-white",
              environment === "QA"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-brand-navy hover:bg-brand-navy/90",
            )}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5 mr-2" />
            )}
            {loading ? "Vinculando..." : `Vincular a ${environment}`}
          </Button>
        </CardContent>
      </Card>

      {/* MODAL DE DESCARGA SEGURA */}
      <Dialog
        open={downloadModal.open}
        onOpenChange={(o) =>
          !o && setDownloadModal({ open: false, type: null })
        }
      >
        <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-navy">
              <Lock className="h-5 w-5 text-amber-500" /> Confirmación de
              Identidad
            </DialogTitle>
            <DialogDescription className="text-xs">
              Para descargar el archivo{" "}
              <b className="text-brand-navy">.{downloadModal.type}</b> de{" "}
              {environment}, ingresa tu **contraseña de acceso al sistema**.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="relative">
              <Input
                type={showDownloadPassword ? "text" : "password"}
                placeholder="Tu contraseña de inicio de sesión..."
                value={downloadPassword}
                onChange={(e) => setDownloadPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-200 focus:border-brand-navy focus:ring-brand-navy/5 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy transition-colors"
              >
                {showDownloadPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDownloadModal({ open: false, type: null });
                setDownloadPassword("");
              }}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDownloadSecure}
              disabled={isDownloading || !downloadPassword}
              className="bg-brand-navy rounded-xl text-white text-xs px-6"
            >
              {isDownloading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Verificar y Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
