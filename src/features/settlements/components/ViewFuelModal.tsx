import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Fuel,
  Droplets,
  Truck,
  User,
  Calendar,
  Gauge,
  AlertTriangle,
  Camera,
  ImageOff,
  Download,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Tipado Estricto ---
interface Carga {
  id: string | number;
  tipo_combustible: "diesel" | "gasolina" | string;
  evidencia_url?: string;
  evidenciaUrl?: string;
  excede_tanque?: boolean;
  excedeTanque?: boolean;
  capacidad_tanque_snapshot?: number;
  capacidadTanque?: number;
  unidadNumero?: string;
  operadorNombre?: string;
  litros?: number;
  precio_por_litro?: number;
  precioPorLitro?: number;
  total?: number;
  fecha_hora?: string;
  fechaHora?: string;
}

interface ViewFuelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: Carga | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";

export function ViewFuelModal({
  open,
  onOpenChange,
  carga,
}: ViewFuelModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [carga, open]);

  if (!carga) return null;

  // Normalización de datos
  const urlTicket = carga.evidencia_url || carga.evidenciaUrl;
  const excede = carga.excede_tanque || carga.excedeTanque;
  const capacidad = carga.capacidad_tanque_snapshot || carga.capacidadTanque;
  const fullUrl = urlTicket ? `${BACKEND_URL}${urlTicket}` : null;
  const extension = urlTicket?.split(".").pop()?.toLowerCase();

  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(
    extension || "",
  );
  const isPdf = extension === "pdf";
  const isUnsupported = urlTicket && !isImage && !isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            {/* ICON PLATE SEMÁNTICO */}
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-inner flex items-center justify-center shrink-0 icon-plate border",
                carga.tipo_combustible === "diesel"
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/20",
              )}
            >
              {carga.tipo_combustible === "diesel" ? (
                <Fuel className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 dark:text-amber-400 drop-shadow-md" />
              ) : (
                <Droplets className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-md" />
              )}
            </div>

            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Detalle de Carga
              </DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Transaction Log ID:{" "}
                <span className="font-mono text-foreground">
                  #{carga.id}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: CUERPO (Scroll Area) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-6 mt-4">
          {/* ALERTA DE EXCESO */}
          {excede && (
            <div className="flex items-center gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-pulse">
              <div className="bg-rose-500 p-2 rounded-lg text-white shadow-lg shadow-rose-500/40">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                  Critical Alert
                </p>
                <p className="font-bold text-rose-700 dark:text-rose-300">
                  Excede capacidad de unidad ({capacidad}L)
                </p>
              </div>
            </div>
          )}

          {/* GRID TÉCNICO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Unidad Info */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
                  Identificación de Unidad
                </label>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-slate-500 dark:text-slate-400">
                    <Truck size={18} />
                  </div>
                  <span className="text-lg font-black uppercase tracking-tight text-foreground">
                    {carga.unidadNumero || "N/A"}
                  </span>
                </div>
              </div>

              {/* Operador Info */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
                  Operador Asignado
                </label>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-slate-500 dark:text-slate-400">
                    <User size={18} />
                  </div>
                  <span className="text-md font-bold uppercase truncate text-foreground">
                    {carga.operadorNombre || "Sin asignar"}
                  </span>
                </div>
              </div>
            </div>

            {/* MÉTRICAS */}
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-4 bg-foreground text-background rounded-2xl flex flex-col justify-between shadow-xl">
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-70">
                    Litros Totales
                  </span>
                  <span className="text-2xl font-mono font-black">
                    {Number(carga.litros || 0).toFixed(1)}
                  </span>
                </div>
                <div className="p-4 bg-card rounded-2xl border border-border flex flex-col justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                    Precio / L
                  </span>
                  <span className="text-xl font-mono font-bold text-foreground">
                    $
                    {Number(
                      carga.precio_por_litro || carga.precioPorLitro || 0,
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-emerald-500 dark:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                    Monto Total Carga
                  </p>
                  <p className="text-3xl font-mono font-black leading-none mt-1">
                    ${Number(carga.total || 0).toFixed(2)}
                  </p>
                </div>
                <Badge className="bg-white/20 backdrop-blur-md border-none text-[10px] font-black">
                  VIGENTE
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* EVIDENCIA SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Camera size={14} className="text-brand-red" /> Evidencia
                Fotográfica HD
              </label>
              {fullUrl && (
                <a
                  href={fullUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors haptic-press"
                >
                  <Download size={12} /> Descargar Master
                </a>
              )}
            </div>

            <div className="relative group border-2 border-dashed border-border rounded-[2rem] overflow-hidden bg-muted/50 flex items-center justify-center min-h-[350px] transition-all hover:border-muted-foreground/30">
              {isImage && !imgError && (
                <img
                  src={fullUrl!}
                  alt="Ticket"
                  className="w-full h-auto max-h-[500px] object-contain p-4 drop-shadow-2xl"
                  onError={() => setImgError(true)}
                />
              )}

              {(imgError || isUnsupported) && (
                <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-tight text-foreground">
                    Fallo de Previsualización
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Formato ({extension}) no compatible con el renderizador
                    nativo.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-6 rounded-full font-black uppercase text-[10px] haptic-press"
                    asChild
                  >
                    <a href={fullUrl!} target="_blank" rel="noreferrer">
                      Ver en visor externo
                    </a>
                  </Button>
                </div>
              )}

              {isPdf && !imgError && (
                <div className="w-full h-[450px] p-4 flex flex-col">
                  <div className="flex-1 bg-card rounded-xl overflow-hidden shadow-inner">
                    <iframe
                      src={`${fullUrl}#view=FitH&toolbar=0`}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  </div>
                </div>
              )}

              {!urlTicket && (
                <div className="flex flex-col items-center justify-center opacity-30">
                  <ImageOff size={48} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">
                    Recurso no encontrado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CAPA 5: FOOTER */}
        <div className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase">
              Timestamp: {carga.fecha_hora?.split("T")[0] || carga.fechaHora}
            </span>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-foreground text-background font-black uppercase text-[11px] tracking-widest px-8 rounded-full h-11 haptic-press hover:scale-105 transition-all shadow-xl"
          >
            Cerrar Registro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
