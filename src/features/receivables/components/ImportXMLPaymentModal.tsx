// src/features/cxc/ImportXMLPaymentModal.tsx
import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  FileCode2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { receivableService } from "@/features/receivables/services/receivableService";

interface ImportXMLPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportXMLPaymentModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportXMLPaymentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".xml")) {
      toast.error("Formato inválido", {
        description: "Solo se aceptan archivos XML del SAT.",
      });
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await receivableService.uploadPaymentXml(file);

      if (res.status === "warning") {
        toast.warning("Lectura completada", { description: res.message });
      } else {
        toast.success("Pago automatizado con éxito", {
          description: res.message,
        });
        onSuccess(); // Refresca la tabla principal
        setTimeout(() => handleClose(), 500);
      }
    } catch (error: any) {
      toast.error("Error al procesar XML", {
        description:
          error.response?.data?.detail ||
          "El archivo está corrupto o no tiene un formato REP válido.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setIsUploading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-muted/50 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-foreground uppercase tracking-tighter">
            <FileCode2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> Cargar XML de
            Pago
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Automatización de Cobranza (Complemento REP)
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {!file ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group",
                isDragging
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-border hover:border-primary hover:bg-muted/50",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".xml"
                className="hidden"
                id="xml-upload"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="xml-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="h-8 w-8 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </div>
                <h3 className="font-black text-foreground uppercase tracking-widest text-sm">
                  Arrastra tu XML aquí
                </h3>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  o haz clic para explorar en tu equipo
                </p>
              </label>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <h3 className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest text-sm w-full truncate px-4">
                {file.name}
              </h3>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 font-bold mt-1 mb-6">
                {(file.size / 1024).toFixed(2)} KB • Archivo Listo
              </p>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  className="flex-1 rounded-xl h-11 text-xs font-black uppercase tracking-widest"
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all haptic-press"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Procesar Pago <FileCode2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />
            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide leading-relaxed">
              El sistema leerá el UUID del XML, buscará la factura en CxC y
              registrará el cobro liquidando el saldo pendiente automáticamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
