import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileCode2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface XMLParsedData {
  uuid: string;
  emisorNombre: string;
  emisorRfc: string;
  montoTotal: number;
  fecha: string;
  xmlFile: File;
}

interface ImportXMLExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: XMLParsedData) => void;
}

export function ImportXMLExpenseModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportXMLExpenseModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Formato inválido", {
        description: "Por favor sube un archivo .xml",
      });
      return;
    }

    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    try {
      // Búsqueda inteligente de nodos sin importar el prefijo (cfdi: o tfd:)
      const getTag = (name: string) =>
        xmlDoc.getElementsByTagNameNS("*", name)[0] ||
        xmlDoc.getElementsByTagName(name)[0] ||
        xmlDoc.getElementsByTagName(`cfdi:${name}`)[0] ||
        xmlDoc.getElementsByTagName(`tfd:${name}`)[0];

      const comprobante = getTag("Comprobante");
      const emisor = getTag("Emisor");
      const timbre = getTag("TimbreFiscalDigital");

      if (!comprobante || !emisor || !timbre) {
        throw new Error("El archivo no parece ser un CFDI válido del SAT.");
      }

      const uuid = timbre.getAttribute("UUID") || "";
      const emisorNombre = emisor.getAttribute("Nombre") || "";
      const emisorRfc = emisor.getAttribute("Rfc") || "";
      const montoTotal = parseFloat(comprobante.getAttribute("Total") || "0");
      const fechaFull = comprobante.getAttribute("Fecha") || "";
      const fecha = fechaFull.split("T")[0]; // Solo YYYY-MM-DD

      if (!uuid || montoTotal <= 0) {
        throw new Error("No se pudo extraer el UUID o el monto total del XML.");
      }

      toast.success("XML procesado correctamente", {
        description: `Proveedor: ${emisorNombre}`,
      });

      onSuccess({
        uuid,
        emisorNombre,
        emisorRfc,
        montoTotal,
        fecha,
        xmlFile: file,
      });
    } catch (error: any) {
      toast.error("Error al leer XML", { description: error.message });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <FileCode2 className="h-6 w-6" /> Importar Factura (XML)
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest">
            Sube el archivo XML del SAT para extraer los datos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "mt-4 p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all haptic-press cursor-pointer",
            isDragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[0.98]"
              : "border-slate-300 dark:border-white/20 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud
            className={cn(
              "h-12 w-12",
              isDragging ? "text-indigo-500" : "text-slate-400",
            )}
          />
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
              Haz clic o arrastra tu archivo aquí
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              Soporta archivos .XML
            </p>
          </div>
          <input
            type="file"
            accept=".xml"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-black uppercase tracking-widest text-[10px] w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
