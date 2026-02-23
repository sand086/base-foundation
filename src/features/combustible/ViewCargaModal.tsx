import { useState, useEffect } from "react"; // ✅ Añadimos useState y useEffect
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://23.29.114.149";

export function ViewCargaModal({ open, onOpenChange, carga }: any) {
  // ✅ Estado para manejar errores de carga de imagen sin romper el DOM
  const [imgError, setImgError] = useState(false);

  // ✅ Resetear el error cuando cambie la carga o se cierre el modal
  useEffect(() => {
    setImgError(false);
  }, [carga, open]);

  if (!carga) return null;

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
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {carga.tipo_combustible === "diesel" ? (
              <Fuel className="h-5 w-5 text-amber-600" />
            ) : (
              <Droplets className="h-5 w-5 text-sky-600" />
            )}
            Detalle de Carga
          </DialogTitle>
          <DialogDescription>Ticket ID: {carga.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {excede && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs font-bold uppercase">
                ¡Alerta! Excede capacidad ({capacidad}L)
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 font-bold px-3 py-1 uppercase",
                carga.tipo_combustible === "diesel"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700",
              )}
            >
              {carga.tipo_combustible}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1 font-mono">
              <Calendar className="h-4 w-4" />
              {carga.fecha_hora?.split("T")[0] || carga.fechaHora}
            </span>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                Unidad
              </p>
              <p className="font-bold flex items-center gap-2">
                <Truck className="h-3 w-3" /> {carga.unidadNumero}
              </p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                Operador
              </p>
              <p className="font-bold flex items-center gap-2 truncate">
                <User className="h-3 w-3" /> {carga.operadorNombre}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-slate-100 rounded-lg border">
              <p className="text-[10px] text-muted-foreground uppercase">
                Litros
              </p>
              <p className="text-lg font-bold font-mono">
                {Number(carga.litros || 0).toFixed(1)}
              </p>
            </div>
            <div className="text-center p-2 bg-slate-100 rounded-lg border">
              <p className="text-[10px] text-muted-foreground uppercase">
                Precio/L
              </p>
              <p className="text-lg font-bold font-mono">
                $
                {Number(
                  carga.precio_por_litro || carga.precioPorLitro || 0,
                ).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-[10px] text-emerald-700 uppercase font-bold">
                Total
              </p>
              <p className="text-lg font-bold font-mono text-emerald-700">
                ${Number(carga.total || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* ✅ SECCIÓN DE EVIDENCIA CORREGIDA */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Camera className="h-3 w-3" /> Evidencia del Ticket
              </p>
              {fullUrl && (
                <a
                  href={fullUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Descargar Original
                </a>
              )}
            </div>

            <div className="relative border-2 border-dashed border-muted rounded-xl overflow-hidden bg-black/5 flex items-center justify-center min-h-[300px]">
              {/* CASO 1: Es una Imagen y no ha fallado */}
              {isImage && !imgError && (
                <img
                  src={fullUrl!}
                  alt="Ticket"
                  className="w-full h-auto max-h-[450px] object-contain"
                  onError={() => setImgError(true)} // ✅ Usamos el estado de React
                />
              )}

              {/* CASO 2: Error en imagen o Formato no soportado */}
              {(imgError || isUnsupported) && (
                <div className="flex flex-col items-center justify-center p-10 text-center gap-4">
                  <AlertCircle className="h-8 w-8 text-rose-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">
                      No se puede previsualizar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Error de carga o formato (. {extension}) no soportado.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={fullUrl!} target="_blank" rel="noreferrer">
                      Ver archivo externo
                    </a>
                  </Button>
                </div>
              )}

              {/* CASO 3: Es un PDF */}
              {isPdf && !imgError && (
                <iframe
                  src={`${fullUrl}#toolbar=0`}
                  className="w-full h-[450px] border-none"
                  title="Vista previa PDF"
                />
              )}

              {/* CASO 4: No hay archivo */}
              {!urlTicket && (
                <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
                  <ImageOff className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-xs font-bold uppercase">
                    Sin archivo adjunto
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
