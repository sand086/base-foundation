// src/features/cxc/ImportXMLPaymentModal.tsx
import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
        onSuccess();
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
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-md p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <FileCode2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Cargar XML de Pago
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Automatización de Cobranza (Complemento REP)
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-6">
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
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner border border-border">
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
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-300 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="font-black text-foreground uppercase tracking-widest text-sm w-full truncate px-4">
                {file.name}
              </h3>
              <p className="text-xs text-muted-foreground font-bold">
                {(file.size / 1024).toFixed(2)} KB • Archivo Listo
              </p>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  className="flex-1 h-11 haptic-press font-black uppercase tracking-widest text-[10px]"
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 h-11 haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
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

          <div className="p-4 border border-border rounded-2xl bg-card shadow-sm flex gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide leading-relaxed">
              El sistema leerá el UUID del XML, buscará la factura en CxC y
              registrará el cobro liquidando el saldo pendiente automáticamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
