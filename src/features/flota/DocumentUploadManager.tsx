import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, History, FileText, Eye, Loader2 } from "lucide-react";
import { unitService } from "@/services/unitService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import axiosClient from "@/api/axiosClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";

interface Props {
  unitId: number;
  unitEconomico: string;
  docType: string;
  docLabel: string;
  currentUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
  statusBadge?: React.ReactNode;
  //  NUEVO: Recibe el input de fecha para renderizarlo dentro
  dateInput?: React.ReactNode;
}

export function DocumentUploadManager({
  unitId,
  unitEconomico,
  docType,
  docLabel,
  currentUrl,
  onUploadSuccess,
  statusBadge,
  dateInput,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await unitService.uploadDocument(
        unitEconomico,
        docType,
        file,
      );
      toast.success("Documento actualizado y versionado");
      onUploadSuccess(result.url);
    } catch (error) {
      toast.error("Error al subir documento");
    } finally {
      setIsUploading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axiosClient.get(
        `/units/${unitId}/documents/${docType}/history`,
      );
      setHistory(res.data);
    } catch (error) {
      console.error("Error cargando historial", error);
    }
  };

  const getFullUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}${path}`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-xl bg-white/5 border-black/10 shadow-sm hover:border-red-500/20 transition-all">
      {/* Encabezado: Título, Badge y Botón Historial */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Label className="font-bold text-sm text-foreground/90">
              {docLabel}
            </Label>
            {/*  ESTATUS AQUÍ: Muy visible al lado del nombre */}
            {statusBadge}
          </div>
        </div>

        {/*  BOTÓN HISTORIAL (Color Azul Claro) */}
        <Dialog
          open={showHistory}
          onOpenChange={(open) => {
            setShowHistory(open);
            if (open) loadHistory();
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
            >
              <History className="w-3.5 h-3.5" /> Historial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Historial: {docLabel}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                  <History className="w-8 h-8 mb-2" />
                  <p className="text-sm">No hay versiones anteriores.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p
                          className="text-sm font-medium truncate w-48"
                          title={item.filename}
                        >
                          {item.filename}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="opacity-70">
                            {new Date(item.uploaded_at).toLocaleString()}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="h-8"
                      >
                        <a
                          href={getFullUrl(item.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-end gap-3 mt-1">
        {/* Input de Archivo */}
        <div className="relative flex-1">
          <Input
            type="file"
            className="hidden"
            id={`file-${docType}`}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.png"
            disabled={isUploading}
          />
          <Label
            htmlFor={`file-${docType}`}
            className={`flex items-center justify-center w-full h-9 px-3 text-xs font-medium transition-all border border-dashed rounded-lg cursor-pointer bg-background/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/50 ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />{" "}
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-2" />{" "}
                {currentUrl ? "Reemplazar" : "Subir"}
              </>
            )}
          </Label>
        </div>

        {/*  CAMPO DE FECHA (Integrado aquí para que se vea junto) */}
        {dateInput && <div className="flex-1 min-w-[130px]">{dateInput}</div>}

        {/*  BOTÓN VER ACTUAL (Color Verde/Esmeralda) */}
        {currentUrl && (
          <Button
            variant="default"
            size="sm"
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            asChild
            title="Ver documento actual"
          >
            <a
              href={getFullUrl(currentUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="w-4 h-4 mr-1.5" /> Ver
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
