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
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";

//   IMPORTAMOS LA LIBRERÍA LECTORA DE EXCEL
import * as XLSX from "xlsx";

interface ImportXMLExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data?: any) => void;
}

export function ImportXMLExpenseModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportXMLExpenseModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().match(/\.(csv|xls|xlsx|txt)$/)) {
      toast.error("Formato inválido", {
        description:
          "Por favor sube el reporte del SAT en formato CSV, XLS o XLSX",
      });
      return;
    }

    setIsUploading(true);

    try {
      //   1. LECTURA NATIVA DE EXCEL (Soporta XLS, XLSX y CSV)
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convertimos la hoja a una matriz bidimensional (Arreglo de arreglos)
      const parsedRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      // 2. Buscamos dónde empiezan las cabeceras (Ignorando las filas vacías del SAT)
      let headerIndex = -1;
      for (let i = 0; i < Math.min(15, parsedRows.length); i++) {
        const row = parsedRows[i];
        if (!row || !Array.isArray(row)) continue;

        const rowString = row.join(" ").toLowerCase();
        if (rowString.includes("rfc emisor") || rowString.includes("uuid")) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) {
        throw new Error(
          "No se encontraron las columnas del SAT (Rfc Emisor, UUID). Verifica el formato de tu archivo.",
        );
      }

      // Extraemos y limpiamos los nombres de las cabeceras
      const headers = parsedRows[headerIndex].map((h: any) =>
        String(h || "").trim(),
      );
      const parsedData = [];

      // 3. Mapeamos las filas a Objetos JSON
      for (let i = headerIndex + 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (!row || row.length === 0) continue;

        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] =
            row[index] !== undefined && row[index] !== null
              ? String(row[index]).trim()
              : "";
        });

        // Solo agregamos la fila si extrajimos exitosamente un UUID
        const rowUUID = obj["UUID"] || obj["uuid"] || obj["Uuid"];
        if (rowUUID && rowUUID.length > 10) {
          parsedData.push(obj);
        }
      }

      if (parsedData.length === 0) {
        throw new Error(
          "El archivo no contiene registros de facturas válidos.",
        );
      }

      // 4. Empaquetamos para FastAPI como Multipart FormData
      const formData = new FormData();
      formData.append("file", file); // Archivo físico original
      formData.append("json_data", JSON.stringify(parsedData)); // Arreglo estructurado

      const response = await axiosClient.post(
        "/api/finance/invoices/bulk-upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      toast.success("Reporte procesado correctamente", {
        description:
          response.data.message ||
          `Se procesaron ${parsedData.length} facturas/pagos exitosamente.`,
      });

      onSuccess(parsedData);
      onOpenChange(false);
    } catch (error: any) {
      console.error("XLSX Parser Error:", error);
      toast.error("Error al procesar el archivo", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <Dialog open={open} onOpenChange={!isUploading ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <FileSpreadsheet className="h-6 w-6" /> Importar Reporte SAT
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest">
            Sube el archivo Excel/CSV descargado del portal del SAT.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "mt-4 p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all",
            !isUploading && "haptic-press cursor-pointer",
            isDragging && !isUploading
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[0.98]"
              : "border-slate-300 dark:border-white/20 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/50",
            isUploading && "opacity-50 pointer-events-none",
          )}
          onDragOver={!isUploading ? handleDragOver : undefined}
          onDragLeave={!isUploading ? handleDragLeave : undefined}
          onDrop={!isUploading ? handleDrop : undefined}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
          ) : (
            <UploadCloud
              className={cn(
                "h-12 w-12",
                isDragging ? "text-indigo-500" : "text-slate-400",
              )}
            />
          )}

          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
              {isUploading
                ? "Procesando registros..."
                : "Haz clic o arrastra tu reporte aquí"}
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              Soporta archivos .XLS, .XLSX y .CSV
            </p>
          </div>
          <input
            type="file"
            accept=".csv, .txt, text/plain, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="font-black uppercase tracking-widest text-[10px] w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
