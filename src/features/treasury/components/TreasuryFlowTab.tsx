// src/features/treasury/components/TreasuryFlowTab.tsx
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CheckCircle2,
  Wallet,
  Filter,
  FilterX,
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
  // =========================================================
  // ESTADOS LOCALES PARA NUEVOS FILTROS
  // =========================================================
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // =========================================================
  // EXTRACCIÓN DE CUENTAS ÚNICAS PARA EL SELECT
  // =========================================================
  const uniqueAccounts = useMemo(() => {
    const map = new Map<string, string>();
    movimientos.forEach((mov) => {
      const bankName = mov.banco
        ? mov.banco.replace(/[\u1000-\uFFFF]/g, "").trim()
        : "Desconocido";
      if (bankName) map.set(bankName, bankName);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [movimientos]);

  // =========================================================
  // LÓGICA DE FILTRADO LOCAL
  // =========================================================
  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((mov) => {
      // 1. Filtro por Cuenta Bancaria (Select)
      if (selectedAccount !== "all") {
        const bankName = mov.banco
          ? mov.banco.replace(/[\u1000-\uFFFF]/g, "").trim()
          : "Desconocido";
        if (bankName !== selectedAccount) return false;
      }

      // 2. Filtro por Rango de Fechas
      if (startDate || endDate) {
        const movDate = mov.fecha ? mov.fecha.split("T")[0] : "";
        if (startDate && movDate < startDate) return false;
        if (endDate && movDate > endDate) return false;
      }

      return true;
    });
  }, [movimientos, selectedAccount, startDate, endDate]);

  // =========================================================
  // RECALCULAR KPIs BASADO EN LO FILTRADO
  // =========================================================
  const dynamicStats = useMemo(() => {
    // Si no hay filtros locales activos, usamos los stats globales que vienen del backend
    if (selectedAccount === "all" && !startDate && !endDate) {
      return stats;
    }

    // Si hay filtros, recalculamos sumando lo que quedó en la tabla
    let total_ingresos = 0;
    let total_egresos = 0;
    filteredMovimientos.forEach((mov) => {
      if (mov.tipo === "ingreso") total_ingresos += Number(mov.monto) || 0;
      if (mov.tipo === "egreso") total_egresos += Number(mov.monto) || 0;
    });

    return { total_ingresos, total_egresos };
  }, [filteredMovimientos, stats, selectedAccount, startDate, endDate]);

  const flujoNeto =
    (dynamicStats.total_ingresos || 0) - (dynamicStats.total_egresos || 0);

  const clearFilters = () => {
    setSelectedAccount("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setMovementFilter("all");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 m-0">
      {/* ========================================================= */}
      {/* CARDS KPI: RESUMEN FINANCIERO DINÁMICO                    */}
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
                Total Abonos (+)
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
              {showBalances
                ? formatCurrency(dynamicStats.total_ingresos)
                : "••••••••"}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Ingresos reales en cuentas
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
                Total Cargos (-)
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
              {showBalances
                ? formatCurrency(dynamicStats.total_egresos)
                : "••••••••"}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Pagos y salidas operativas
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
                Flujo Neto
              </p>
            </div>
            <p
              className={cn(
                "text-3xl font-black font-mono tracking-tighter",
                flujoNeto >= 0 ? "text-white" : "text-rose-400",
              )}
            >
              {showBalances ? formatCurrency(flujoNeto) : "••••••••"}
            </p>
            <p className="text-[11px] font-bold text-blue-200/90 uppercase tracking-widest mt-1">
              {flujoNeto >= 0 ? "Flujo Positivo" : "Flujo Negativo"}
            </p>
          </div>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* TOOLBAR AVANZADO DE FILTROS                               */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-inner">
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Búsqueda por Nombre / Concepto */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Buscar concepto, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm font-mono text-xs"
            />
          </div>

          {/* 2. Select Option de Cuenta Bancaria */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 h-10 shadow-sm min-w-[200px]">
            <Filter className="h-4 w-4 text-slate-400 mr-2" />
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full border-none shadow-none h-8 bg-transparent p-0 pr-2 focus:ring-0 text-xs font-bold text-slate-700 dark:text-slate-300">
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold text-xs">
                  Todas las cuentas
                </SelectItem>
                {uniqueAccounts.map((acc, index) => (
                  <SelectItem
                    key={index}
                    value={acc}
                    className="text-xs uppercase"
                  >
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Rango de Fechas (De - A) */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 h-10 shadow-sm gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              De:
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 w-[120px] text-xs border-none bg-transparent p-0 focus-visible:ring-0 shadow-none text-slate-700 dark:text-slate-300"
            />
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              A:
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 w-[120px] text-xs border-none bg-transparent p-0 focus-visible:ring-0 shadow-none text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* 4. Botón de Limpiar Filtros */}
          {(selectedAccount !== "all" ||
            startDate ||
            endDate ||
            searchTerm) && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-10 text-slate-500 hover:text-brand-red flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
            >
              <FilterX className="h-4 w-4" /> Limpiar
            </Button>
          )}

          {/* 5. Botón de Actualizar (fetch) */}
          <Button
            variant="outline"
            className="h-10 w-10 ml-auto p-0 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
            onClick={fetchMovements}
            disabled={isMovementsLoading}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-slate-600 dark:text-slate-300",
                isMovementsLoading && "animate-spin",
              )}
            />
          </Button>
        </div>

        {/* Opciones de tipo de movimiento */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto self-start">
          <button
            onClick={() => setMovementFilter("all")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              movementFilter === "all"
                ? "bg-white dark:bg-slate-700 text-brand-navy dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            Estado de Cuenta
          </button>
          <button
            onClick={() => setMovementFilter("egreso")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex gap-2 transition-all whitespace-nowrap",
              movementFilter === "egreso"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            Solo Cargos (-)
          </button>
          <button
            onClick={() => setMovementFilter("ingreso")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex gap-2 transition-all whitespace-nowrap",
              movementFilter === "ingreso"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            Solo Abonos (+)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TABLA PRINCIPAL ESTILO "ESTADO DE CUENTA BANCARIO"        */}
      {/* ========================================================= */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-300/60 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl">
        <div className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-white/10 px-6 py-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-slate-500" />
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">
              Libro Mayor de Tesorería
            </h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Registro contable detallado ({filteredMovimientos.length}{" "}
              movimientos)
            </p>
          </div>
        </div>

        <div className="overflow-auto max-h-[65vh] custom-scrollbar">
          <Table className="w-full text-sm">
            <TableHeader className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-white/20 shadow-sm">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-14 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 h-12">
                  <CheckCircle2 className="w-4 h-4 opacity-50" />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 h-12 w-[120px]">
                  Fecha
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 h-12">
                  Descripción / Referencia
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 h-12 w-[180px]">
                  Cuenta
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 text-right h-12 w-[140px] bg-rose-50/50 dark:bg-rose-950/20">
                  Cargos (-)
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 text-right h-12 w-[140px] bg-emerald-50/50 dark:bg-emerald-950/20">
                  Abonos (+)
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 text-center pr-6 h-12 w-[80px]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMovementsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-16 text-center">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-brand-navy/50 dark:text-blue-400" />
                  </TableCell>
                </TableRow>
              ) : filteredMovimientos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                  >
                    <Landmark className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    No se encontraron movimientos para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovimientos.map((mov) => {
                  const logoSvg = getBankLogo(mov.banco);
                  const bankNameClean = mov.banco
                    ? mov.banco.replace(/[\u1000-\uFFFF]/g, "").trim()
                    : "Banco";
                  const esCargo = mov.tipo === "egreso";
                  const esAbono = mov.tipo === "ingreso";

                  return (
                    <TableRow
                      key={mov.id}
                      className={cn(
                        "border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150",
                        mov.conciliado &&
                          "bg-slate-50/50 dark:bg-slate-900/30 opacity-70",
                      )}
                    >
                      <TableCell className="w-14 pl-6 align-top pt-4">
                        <Checkbox
                          checked={mov.conciliado}
                          onCheckedChange={() =>
                            handleToggleConciliacion(mov.id)
                          }
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                      </TableCell>
                      <TableCell className="align-top pt-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {mov.fecha ? mov.fecha.split("T")[0] : ""}
                      </TableCell>
                      <TableCell className="align-top pt-4 max-w-[300px]">
                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-xs leading-snug">
                          {mov.concepto}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 uppercase tracking-wider">
                          Ref:{" "}
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {mov.referencia_bancaria || "N/A"}
                          </span>
                          <span className="mx-2 opacity-30">|</span>
                          Origen: {mov.origen_modulo || "CXC"}
                        </p>
                      </TableCell>
                      <TableCell className="align-top pt-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 shrink-0 grayscale opacity-80">
                            {logoSvg ? (
                              <img
                                src={logoSvg}
                                alt={bankNameClean}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Landmark className="h-4 w-4 text-slate-400" />
                            )}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-tight text-slate-600 dark:text-slate-300 truncate">
                            {bankNameClean}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-top pt-4 text-right bg-rose-50/20 dark:bg-rose-950/10 border-l border-r border-slate-100 dark:border-white/5">
                        {esCargo ? (
                          <span className="font-black font-mono text-sm text-slate-800 dark:text-white">
                            {formatCurrency(Number(mov.monto))}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-mono">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-top pt-4 text-right bg-emerald-50/20 dark:bg-emerald-950/10 border-r border-slate-100 dark:border-white/5">
                        {esAbono ? (
                          <span className="font-black font-mono text-sm text-slate-800 dark:text-white">
                            {formatCurrency(Number(mov.monto))}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-mono">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-top pt-3 text-center pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
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
