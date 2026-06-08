import React, { useState } from "react";
import { Download, Loader2, FileSpreadsheet, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import axiosClient from "@/api/axiosClient";

interface AgingExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cxc" | "cxp"; // Para saber si es de clientes o proveedores
}

export function AgingExportModal({
  open,
  onOpenChange,
  type,
}: AgingExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generando Excel con múltiples pestañas...");

    try {
      let url = `/api/finance/export/aging?module_type=${type}`;

      // Transformar el formato YYYY-MM a fechas completas para que la API no falle
      let finalStartDate = startDate;
      let finalEndDate = endDate;

      if (startDate && startDate.length === 7) {
        // Primer día del mes seleccionado
        finalStartDate = `${startDate}-01`;
      }
      if (endDate && endDate.length === 7) {
        // Último día del mes seleccionado
        const [year, month] = endDate.split("-");
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        finalEndDate = `${endDate}-${lastDay}`;
      }

      if (finalStartDate) url += `&start_date=${finalStartDate}`;
      if (finalEndDate) url += `&end_date=${finalEndDate}`;

      const response = await axiosClient.get(url, { responseType: "blob" });

      const disposition = response.headers["content-disposition"];
      let filename = `Antiguedad_Saldos_${type.toUpperCase()}.xlsx`;
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename="([^"]*)"/.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1];
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("¡Reporte Exportado Exitosamente!", { id: toastId });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte de saldos.", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const title =
    type === "cxc"
      ? "Antigüedad de Saldos (CxC)"
      : "Antigüedad de Saldos (CxP)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card rounded-2xl border border-border shadow-xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-center text-xl font-black text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-xs mt-2">
            Descarga un archivo de <strong>Excel</strong> con 2 pestañas: una de{" "}
            <strong>Totales consolidados</strong> (0-30 días, 31-60, etc.) y
            otra con el <strong>detalle exacto</strong>.
            <br />
            <br />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              * Nota: Solo se incluirán facturas con deuda activa (Saldo mayor a
              $0 y no canceladas).
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 bg-muted/30 p-5 rounded-xl border border-border/50 my-2">
          <p className="text-xs font-bold text-slate-500 text-center -mt-2">
            Filtrar por Mes de Emisión (Opcional)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> Desde
              </Label>
              <Input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background text-xs font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> Hasta
              </Label>
              <Input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-6 shadow-md shadow-emerald-500/20"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
