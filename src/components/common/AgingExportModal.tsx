import React, { useState, useMemo } from "react";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  X,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  CalendarDays,
  Search, // <-- NUEVO: Importamos el ícono Search
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";

interface AgingExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cxc" | "cxp";
  invoices?: any[];
}

export function AgingExportModal({
  open,
  onOpenChange,
  type,
  invoices = [],
}: AgingExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // <-- NUEVO: Estado para el buscador de entidad
  const [searchEntity, setSearchEntity] = useState("");

  // ========================================================
  // MOTOR DE LA TABLA DINÁMICA (Cálculo en Tiempo Real)
  // ========================================================
  const tableData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary: Record<string, any> = {};

    const validInvoices = invoices.filter((inv) => {
      const saldo = Number(inv.saldo_pendiente) || 0;
      const statusStr = String(
        inv.estatus || inv.status || inv.status_sat || "",
      ).toLowerCase();

      if (saldo <= 0 || statusStr === "cancelado" || statusStr === "error")
        return false;

      if (startDate || endDate) {
        const emisionStr = inv.fecha_emision
          ? String(inv.fecha_emision).split("T")[0]
          : null;
        if (emisionStr) {
          const emision = new Date(`${emisionStr}T00:00:00`);
          if (startDate && emision < new Date(`${startDate}T00:00:00`))
            return false;
          if (endDate && emision > new Date(`${endDate}T23:59:59`))
            return false;
        }
      }
      return true;
    });

    validInvoices.forEach((inv) => {
      const entityName =
        inv.cliente ||
        inv.proveedor ||
        inv.client?.razon_social ||
        inv.supplier?.razon_social ||
        inv.supplier_razon_social ||
        inv.client_razon_social ||
        "Entidad Desconocida";

      if (!summary[entityName]) {
        summary[entityName] = {
          entidad: entityName,
          alCorriente: 0,
          dias1_30: 0,
          dias31_60: 0,
          dias61_90: 0,
          mas90: 0,
          total: 0,
        };
      }

      let daysLate = 0;
      if (inv.fecha_vencimiento) {
        const vencStr = String(inv.fecha_vencimiento).split("T")[0];
        const venc = new Date(`${vencStr}T00:00:00`);
        const diffTime = today.getTime() - venc.getTime();
        daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const saldo = Number(inv.saldo_pendiente) || 0;
      summary[entityName].total += saldo;

      if (daysLate <= 0) summary[entityName].alCorriente += saldo;
      else if (daysLate <= 30) summary[entityName].dias1_30 += saldo;
      else if (daysLate <= 60) summary[entityName].dias31_60 += saldo;
      else if (daysLate <= 90) summary[entityName].dias61_90 += saldo;
      else summary[entityName].mas90 += saldo;
    });

    // <-- NUEVO: Filtramos por el texto ingresado en el buscador antes de ordenar
    return Object.values(summary)
      .filter((row: any) =>
        row.entidad.toLowerCase().includes(searchEntity.toLowerCase()),
      )
      .sort((a: any, b: any) => b.total - a.total);
  }, [invoices, startDate, endDate, searchEntity]); // <-- NUEVO: Agregamos searchEntity a las dependencias

  // ========================================================
  // CÁLCULO DE KPIS Y TOTALES GLOBALES
  // ========================================================
  const totals = useMemo(() => {
    return tableData.reduce(
      (acc, row) => {
        acc.alCorriente += row.alCorriente;
        acc.dias1_30 += row.dias1_30;
        acc.dias31_60 += row.dias31_60;
        acc.dias61_90 += row.dias61_90;
        acc.mas90 += row.mas90;
        acc.total += row.total;
        return acc;
      },
      {
        alCorriente: 0,
        dias1_30: 0,
        dias31_60: 0,
        dias61_90: 0,
        mas90: 0,
        total: 0,
      },
    );
  }, [tableData]);

  // Métricas para las Tarjetas Superiores
  const totalRisk = totals.total - totals.alCorriente;
  const healthPercentage =
    totals.total > 0 ? (totals.alCorriente / totals.total) * 100 : 0;
  const riskPercentage =
    totals.total > 0 ? (totalRisk / totals.total) * 100 : 0;

  // ========================================================
  // FUNCIÓN DE EXPORTACIÓN A PYTHON
  // ========================================================
  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generando Excel Consolidado...");

    try {
      let url = `/api/finance/export/aging?module_type=${type}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

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

      toast.success("Reporte Exportado Exitosamente", { id: toastId });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte en Excel.", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);

  const title =
    type === "cxc"
      ? "Saldos Totales (Cuentas por Cobrar)"
      : "Saldos Totales (Cuentas por Pagar)";
  const entityLabel = type === "cxc" ? "Cliente" : "Proveedor";

  // <-- NUEVO: Función para resetear el buscador al cerrar
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSearchEntity("");
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh]">
        {/* ========================================== */}
        {/* 1. HEADER & CONTROLES */}
        {/* ========================================== */}
        <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-navy dark:bg-brand-navy rounded-2xl flex items-center justify-center shadow-inner shrink-0 border border-brand-navy/20">
              <FileSpreadsheet className="h-7 w-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-black text-brand-navy dark:text-white uppercase tracking-tight leading-none">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                Dashboard Dinámico • Análisis de Antigüedad
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto bg-slate-100/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200 dark:border-white/5">
            {/* <-- NUEVO: BUSCADOR DE ENTIDAD --> */}
            <div className="flex items-center relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={`Buscar ${entityLabel.toLowerCase()}...`}
                value={searchEntity}
                onChange={(e) => setSearchEntity(e.target.value)}
                className="h-9 w-[160px] md:w-[200px] pl-8 text-xs font-bold bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl focus:ring-brand-red placeholder:font-medium placeholder:uppercase"
              />
            </div>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1"></div>
            {/* <-- FIN NUEVO --> */}

            <div className="flex items-center gap-2">
              <Label className="text-[9px] font-black uppercase text-slate-500 hidden sm:block">
                Desde
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[130px] text-xs font-bold bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl focus:ring-brand-red"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[9px] font-black uppercase text-slate-500 hidden sm:block">
                Hasta
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[130px] text-xs font-bold bg-white dark:bg-slate-900 border-none shadow-sm rounded-xl focus:ring-brand-red"
              />
            </div>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1"></div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] haptic-press"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* ========================================== */}
        {/* 2. BODY SCROLLABLE (KPIS + TABLA) */}
        {/* ========================================== */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950 flex flex-col p-6 md:p-8 gap-6 relative">
          {/* Tarjetas KPI (Insights Financieros) */}
          {tableData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Deuda Total Filtrada
                  </p>
                  <p className="text-2xl font-black text-brand-navy dark:text-white tracking-tighter">
                    {formatMoney(totals.total)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-brand-navy dark:text-white" />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-2 bg-emerald-500"></div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Cartera Sana
                  </p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">
                    {formatMoney(totals.alCorriente)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">
                    {healthPercentage.toFixed(1)}% del total mostrado
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-2 bg-rose-500"></div>
                <div>
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cartera Vencida
                  </p>
                  <p className="text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tighter">
                    {formatMoney(totalRisk)}
                  </p>
                  <p className="text-[10px] font-bold text-rose-600 mt-1">
                    {riskPercentage.toFixed(1)}% en riesgo
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estado Vacío */}
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 border-dashed">
              <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                Esperando Datos...
              </p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 border-dashed">
              <TrendingUp className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                No hay resultados para tu búsqueda
              </p>
            </div>
          ) : (
            /* Tabla Principal con Sticky Headers */
            <div className="flex-1 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col relative z-0">
              <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full text-sm text-left relative">
                  {/* CABECERA FLOTANTE (STICKY) */}
                  <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md shadow-sm">
                    <tr>
                      <th className="px-5 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-200 dark:border-white/10">
                        {entityLabel}
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 border-b border-slate-200 dark:border-white/10">
                        Al Corriente
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 border-b border-slate-200 dark:border-white/10">
                        1 a 30 Días
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 border-b border-slate-200 dark:border-white/10">
                        31 a 60 Días
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 border-b border-slate-200 dark:border-white/10">
                        61 a 90 Días
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400 border-b border-slate-200 dark:border-white/10">
                        + 90 Días
                      </th>
                      <th className="px-5 py-4 text-right whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-white bg-slate-200/50 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shadow-inner">
                        Deuda Total
                      </th>
                    </tr>
                  </thead>

                  {/* CUERPO DE LA TABLA */}
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {tableData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td
                          className="px-5 py-3 font-bold text-[11px] uppercase tracking-tight text-slate-800 dark:text-slate-200 max-w-[250px] truncate"
                          title={row.entidad}
                        >
                          {row.entidad}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3 text-right font-mono text-[13px] tracking-tight",
                            row.alCorriente > 0
                              ? "text-emerald-700 dark:text-emerald-400 font-bold"
                              : "text-slate-300 dark:text-slate-600",
                          )}
                        >
                          {formatMoney(row.alCorriente)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3 text-right font-mono text-[13px] tracking-tight",
                            row.dias1_30 > 0
                              ? "text-amber-600 font-bold"
                              : "text-slate-300 dark:text-slate-600",
                          )}
                        >
                          {formatMoney(row.dias1_30)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3 text-right font-mono text-[13px] tracking-tight",
                            row.dias31_60 > 0
                              ? "text-orange-600 font-bold"
                              : "text-slate-300 dark:text-slate-600",
                          )}
                        >
                          {formatMoney(row.dias31_60)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3 text-right font-mono text-[13px] tracking-tight",
                            row.dias61_90 > 0
                              ? "text-rose-500 font-bold"
                              : "text-slate-300 dark:text-slate-600",
                          )}
                        >
                          {formatMoney(row.dias61_90)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3 text-right font-mono text-[13px] tracking-tight",
                            row.mas90 > 0
                              ? "text-rose-700 dark:text-rose-400 font-bold"
                              : "text-slate-300 dark:text-slate-600",
                          )}
                        >
                          {formatMoney(row.mas90)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[14px] font-black text-brand-navy dark:text-white bg-slate-50 dark:bg-slate-900/50 tracking-tight">
                          {formatMoney(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* PIE DE TABLA FLOTANTE (STICKY FOOTER) */}
                  <tfoot className="sticky bottom-0 z-20 bg-brand-navy dark:bg-slate-900 text-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] border-t border-brand-red">
                    <tr>
                      <td className="px-5 py-4 font-black text-[10px] uppercase tracking-widest">
                        TOTALES FILTRADOS
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-bold text-emerald-400 tracking-tight">
                        {formatMoney(totals.alCorriente)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-bold text-amber-400 tracking-tight">
                        {formatMoney(totals.dias1_30)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-bold text-orange-400 tracking-tight">
                        {formatMoney(totals.dias31_60)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-bold text-rose-300 tracking-tight">
                        {formatMoney(totals.dias61_90)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-bold text-rose-500 tracking-tight">
                        {formatMoney(totals.mas90)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[15px] font-black text-white bg-black/20 tracking-tighter">
                        {formatMoney(totals.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* 3. FOOTER DEL MODAL */}
        {/* ========================================== */}
        <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0 relative z-20">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-[11px] font-black uppercase tracking-widest h-11 px-8 rounded-xl haptic-press text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar Panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
