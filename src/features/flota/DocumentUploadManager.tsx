// src/components/flota/DocumentUploadManager.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, History, FileText, Eye } from "lucide-react";
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
import axiosClient from "@/api/axiosClient"; // Asumiendo que tienes esto

interface Props {
  unitId: number;
  unitEconomico: string;
  docType: string; // 'poliza_seguro', 'caat', etc.
  docLabel: string;
  currentUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
}

export function DocumentUploadManager({
  unitId,
  unitEconomico,
  docType,
  docLabel,
  currentUrl,
  onUploadSuccess,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Función para subir archivo
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

  // Función para cargar historial
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

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/20">
      <div className="flex justify-between items-center">
        <Label className="font-medium">{docLabel}</Label>

        {/* Botón Ver Historial */}
        <Dialog
          open={showHistory}
          onOpenChange={(open) => {
            setShowHistory(open);
            if (open) loadHistory();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
              <History className="w-3 h-3" /> Historial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Historial de Versiones: {docLabel}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  No hay versiones anteriores.
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-3 h-3 mr-1" /> Ver
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

      <div className="flex items-center gap-2">
        {/* Input de archivo oculto + Botón personalizado */}
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
            className={`flex items-center justify-center w-full h-9 px-3 py-1 text-sm font-medium transition-colors border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground ${isUploading ? "opacity-50" : ""}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Subiendo..." : "Subir Nuevo / Reemplazar"}
          </Label>
        </div>

        {/* Botón ver actual */}
        {currentUrl && (
          <Button
            variant="secondary"
            size="icon"
            asChild
            title="Ver documento actual"
          >
            <a href={currentUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
