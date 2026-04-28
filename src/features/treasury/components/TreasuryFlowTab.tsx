// src/features/treasury/components/TreasuryFlowTab.tsx
import { useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Calculator,
  Wallet,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BankMovement } from "../types";
import { getBankLogo } from "../utils/bankUtils";

interface TreasuryFlowTabProps {
  stats: any;
  movimientos: BankMovement[];
  isMovementsLoading: boolean;
  showBalances: boolean;
  formatCurrency: (amount: number) => string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  movementFilter: "all" | "egreso" | "ingreso";
  setMovementFilter: (val: "all" | "egreso" | "ingreso") => void;
  fetchMovements: () => void;
  handleToggleConciliacion: (id: number) => void;
  onViewMovement: (mov: BankMovement) => void;
  onDeleteMovement: (mov: BankMovement) => void;
}

export function TreasuryFlowTab({
  stats,
  movimientos,
  isMovementsLoading,
  showBalances,
  formatCurrency,
  searchTerm,
  setSearchTerm,
  movementFilter,
  setMovementFilter,
  fetchMovements,
  handleToggleConciliacion,
  onViewMovement,
  onDeleteMovement,
}: TreasuryFlowTabProps) {
  // =====================================================================
  // MOTOR FINANCIERO PARA EL CONTADOR (Agrupación de Flujo de Efectivo)
  // =====================================================================
  const reporteFinanciero = useMemo(() => {
    let ingresosCxC = 0; // Lo que ya me pagaron de facturas
    let ingresosOtros = 0; // Préstamos, aportaciones de capital, etc.
    let egresosCxP = 0; // Lo que ya pagué a proveedores
    let egresosOtros = 0; // Nómina, impuestos, caja chica, etc.

    movimientos.forEach((mov) => {
      const monto = Number(mov.monto) || 0;
      if (mov.tipo === "ingreso") {
        if (mov.origen_modulo === "CxC") ingresosCxC += monto;
        else ingresosOtros += monto;
      } else if (mov.tipo === "egreso") {
        if (mov.origen_modulo === "CxP") egresosCxP += monto;
        else egresosOtros += monto;
      }
    });

    const totalIngresos = ingresosCxC + ingresosOtros;
    const totalEgresos = egresosCxP + egresosOtros;
    const flujoNeto = totalIngresos - totalEgresos;

    return {
      ingresosCxC,
      ingresosOtros,
      totalIngresos,
      egresosCxP,
      egresosOtros,
      totalEgresos,
      flujoNeto,
    };
  }, [movimientos]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 m-0">
      {/* ========================================================= */}
      {/* CARDS BONITAS Y ELEGANTES (KPIs FINANCIEROS)              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 relative overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all cursor-default bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-2">
              <ArrowUpRight className="w-4 h-4" />
              <p className="text-[11px] font-black uppercase tracking-widest">
                Entradas (Cobrado)
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
              {showBalances
                ? formatCurrency(reporteFinanciero.totalIngresos)
                : "••••••••"}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Dinero real en cuentas
            </p>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover:border-rose-200 dark:hover:border-rose-900/50 transition-all cursor-default bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-24 h-24 text-rose-600" />
          </div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-2">
              <ArrowDownLeft className="w-4 h-4" />
              <p className="text-[11px] font-black uppercase tracking-widest">
                Salidas (Pagado)
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
              {showBalances
                ? formatCurrency(reporteFinanciero.totalEgresos)
                : "••••••••"}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Pagos a proveedores y gastos
            </p>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group transition-all cursor-default shadow-sm hover:shadow-md border-brand-navy/20 dark:border-blue-900/50 bg-brand-navy dark:bg-slate-900">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-200 mb-2">
              <Calculator className="w-4 h-4" />
              <p className="text-[11px] font-black uppercase tracking-widest">
                Flujo Neto del Periodo
              </p>
            </div>
            <p
              className={cn(
                "text-3xl font-black font-mono tracking-tighter",
                reporteFinanciero.flujoNeto >= 0
                  ? "text-white"
                  : "text-rose-400",
              )}
            >
              {showBalances
                ? formatCurrency(reporteFinanciero.flujoNeto)
                : "••••••••"}
            </p>
            <p className="text-xs font-medium text-blue-200/70">
              {reporteFinanciero.flujoNeto >= 0
                ? "Superávit de efectivo"
                : "Déficit de efectivo"}
            </p>
          </div>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* VISTA CONTADOR: ESTADO DE FLUJO DE EFECTIVO (TABLA)       */}
      {/* ========================================================= */}
      <Card className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-md">
        <div className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-white/10 px-6 py-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-500" />
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">
              Estado de Flujo de Efectivo
            </h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Resumen Operativo Conciliado
            </p>
          </div>
        </div>
        <div className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {/* SECCIÓN INGRESOS */}
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td
                  colSpan={2}
                  className="px-6 py-3 font-black text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-500"
                >
                  Actividades de Operación (Ingresos)
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-3 pl-10 font-medium text-slate-600 dark:text-slate-300">
                  Cobro a Clientes (CxC)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(reporteFinanciero.ingresosCxC)}
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-3 pl-10 font-medium text-slate-600 dark:text-slate-300">
                  Otros Ingresos
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(reporteFinanciero.ingresosOtros)}
                </td>
              </tr>
              <tr className="border-b-2 border-slate-200 dark:border-white/10 bg-emerald-50/30 dark:bg-emerald-900/10">
                <td className="px-6 py-3 font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-xs">
                  Total Ingresos Operativos
                </td>
                <td className="px-6 py-3 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reporteFinanciero.totalIngresos)}
                </td>
              </tr>

              {/* SECCIÓN EGRESOS */}
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td
                  colSpan={2}
                  className="px-6 py-3 font-black text-xs uppercase tracking-widest text-rose-700 dark:text-rose-500"
                >
                  Actividades de Operación (Egresos)
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-3 pl-10 font-medium text-slate-600 dark:text-slate-300">
                  Pago a Proveedores (CxP)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(reporteFinanciero.egresosCxP)}
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-3 pl-10 font-medium text-slate-600 dark:text-slate-300">
                  Otros Egresos Operativos
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(reporteFinanciero.egresosOtros)}
                </td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-rose-50/30 dark:bg-rose-900/10">
                <td className="px-6 py-3 font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-xs">
                  Total Egresos Operativos
                </td>
                <td className="px-6 py-3 text-right font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatCurrency(reporteFinanciero.totalEgresos)}
                </td>
              </tr>

              {/* GRAN TOTAL */}
              <tr className="bg-slate-100 dark:bg-slate-800">
                <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-widest">
                  Flujo de Efectivo Neto
                </td>
                <td
                  className={cn(
                    "px-6 py-4 text-right font-black font-mono text-lg underline decoration-double underline-offset-4",
                    reporteFinanciero.flujoNeto >= 0
                      ? "text-emerald-600 dark:text-emerald-400 decoration-emerald-300"
                      : "text-rose-600 dark:text-rose-400 decoration-rose-300",
                  )}
                >
                  {formatCurrency(reporteFinanciero.flujoNeto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* TOOLBAR Y LIBRO MAYOR (DETALLE DE MOVIMIENTOS BANCARIOS)  */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-inner mt-8">
        <div className="relative flex-1 w-full lg:w-1/3 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar concepto, banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
          />
        </div>
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setMovementFilter("all")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              movementFilter === "all"
                ? "bg-white dark:bg-slate-700 text-brand-navy dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            Libro Mayor
          </button>
          <button
            onClick={() => setMovementFilter("egreso")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex gap-2 transition-all",
              movementFilter === "egreso"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" /> Salidas
          </button>
          <button
            onClick={() => setMovementFilter("ingreso")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex gap-2 transition-all",
              movementFilter === "ingreso"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Ingresos
          </button>
        </div>
        <Button
          variant="outline"
          className="h-11 w-full sm:w-11 rounded-xl"
          onClick={fetchMovements}
          disabled={isMovementsLoading}
        >
          <RefreshCw
            className={cn("h-4 w-4", isMovementsLoading && "animate-spin")}
          />
        </Button>
      </div>

      {/* TABLA DE DETALLE BANCARIO */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm shadow-xl liquid-glass-table">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <Table className="w-full text-sm">
            <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-14 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                  Conc.
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                  Fecha
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                  Concepto / Ref
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 h-12">
                  Banco
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-right h-12">
                  Monto
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-center pr-6 h-12">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMovementsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-16 text-center">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-brand-red/50 dark:text-brand-red" />
                  </TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                  >
                    <Landmark className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    No hay movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => {
                  const logoSvg = getBankLogo(mov.banco);
                  const bankNameClean = mov.banco
                    ? mov.banco.replace(/[\u1000-\uFFFF]/g, "").trim()
                    : "Banco";

                  return (
                    <TableRow
                      key={mov.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-white/5 interactive-row transition-colors duration-200",
                        mov.conciliado &&
                          "bg-emerald-50/30 dark:bg-emerald-950/20",
                      )}
                    >
                      <TableCell className="w-14 pl-6">
                        <Checkbox
                          checked={mov.conciliado}
                          onCheckedChange={() =>
                            handleToggleConciliacion(mov.id)
                          }
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                      </TableCell>
                      <TableCell className="py-4 font-mono text-sm font-medium text-slate-500 dark:text-slate-400">
                        {mov.fecha ? mov.fecha.split("T")[0] : ""}
                      </TableCell>
                      <TableCell className="py-4 max-w-[250px]">
                        <p className="font-black text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight text-sm">
                          {mov.concepto}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                          REF: {mov.referencia_bancaria || "N/A"} • ORIGEN:{" "}
                          {mov.origen_modulo || "MANUAL"}
                        </p>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 shrink-0">
                            {logoSvg ? (
                              <img
                                src={logoSvg}
                                alt={bankNameClean}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Landmark className="h-5 w-5 text-slate-400" />
                            )}
                          </span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {bankNameClean}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <span
                          className={cn(
                            "font-black font-mono text-sm",
                            mov.tipo === "ingreso"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {mov.tipo === "ingreso" ? "+" : "-"}{" "}
                          {formatCurrency(Number(mov.monto))}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="glass-panel border-white/20 min-w-[160px] rounded-xl z-50 dark:bg-slate-900/90"
                          >
                            <DropdownMenuItem
                              onClick={() => onViewMovement(mov)}
                              className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer rounded-lg dark:text-slate-300 dark:focus:bg-slate-800"
                            >
                              <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="dark:bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => onDeleteMovement(mov)}
                              className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer rounded-lg dark:focus:bg-rose-950/30"
                            >
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
