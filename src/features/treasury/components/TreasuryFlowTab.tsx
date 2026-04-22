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
  Landmark,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BankMovement } from "../types";

// 🚀 FIX: Importamos nuestra utilidad global en lugar de quemar los SVGs aquí
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
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 m-0">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Total Ingresos
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter leading-none">
              {showBalances ? formatCurrency(stats.total_ingresos) : "••••••••"}
            </p>
          </div>
        </Card>
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Total Egresos
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tighter leading-none">
              {showBalances ? formatCurrency(stats.total_egresos) : "••••••••"}
            </p>
          </div>
        </Card>
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/30 rounded-2xl border border-cyan-100 dark:border-cyan-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <CheckCircle2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Conciliados
            </p>
            <p className="text-3xl font-black text-cyan-600 dark:text-cyan-400 leading-none tracking-tighter">
              {stats.conciliados}
            </p>
          </div>
        </Card>
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Pendientes
            </p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
              {stats.pendientes}
            </p>
          </div>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-inner">
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
            Libro Total
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

      {/* TABLA */}
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
                  // 🚀 Obtenemos el logo SVG para cada fila
                  const logoSvg = getBankLogo(mov.banco);

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
                        {mov.fecha}
                      </TableCell>
                      <TableCell className="py-4 max-w-[250px]">
                        <p className="font-black text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight text-sm">
                          {mov.concepto}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                          REF: {mov.referencia_bancaria || "N/A"}
                        </p>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6">
                            {mov.banco}
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
                          {mov.tipo === "ingreso" ? "+" : "-"}
                          {formatCurrency(mov.monto)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
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
