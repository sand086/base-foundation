import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
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

const bankLogos: Record<string, string> = {
  Banamex: "🏛️",
  Santander: "🏦",
  Banorte: "💳",
  BBVA: "🏧",
  HSBC: "🦁",
  Scotiabank: "🍁",
};

interface TreasuryFlowTabProps {
  stats: any;
  movimientos: BankMovement[];
  isMovementsLoading: boolean;
  showBalances: boolean;
  formatCurrency: (amount: number) => string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  movementFilter: "all" | "operativa" | "cobranza";
  setMovementFilter: (val: "all" | "operativa" | "cobranza") => void;
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
        <Card className="p-6 flex items-center gap-5 group bg-card/40 backdrop-blur-md border-white/20 shadow-sm">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 shadow-inner group-hover:scale-110 transition-transform">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              Total Ingresos
            </p>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter leading-none">
              {showBalances ? formatCurrency(stats.total_ingresos) : "••••••••"}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-5 group bg-card/40 backdrop-blur-md border-white/20 shadow-sm">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 shadow-inner group-hover:scale-110 transition-transform">
            <TrendingDown className="h-6 w-6 text-rose-600" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              Total Egresos
            </p>
            <p className="text-2xl font-black text-rose-600 font-mono tracking-tighter leading-none">
              {showBalances ? formatCurrency(stats.total_egresos) : "••••••••"}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-5 group bg-card/40 backdrop-blur-md border-white/20 shadow-sm">
          <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/30 rounded-2xl border border-cyan-100 shadow-inner group-hover:scale-110 transition-transform">
            <CheckCircle2 className="h-6 w-6 text-cyan-600" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              Conciliados
            </p>
            <p className="text-3xl font-black text-cyan-600 leading-none tracking-tighter">
              {stats.conciliados}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-5 group bg-card/40 backdrop-blur-md border-white/20 shadow-sm">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 shadow-inner group-hover:scale-110 transition-transform">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              Pendientes
            </p>
            <p className="text-3xl font-black text-amber-600 leading-none tracking-tighter">
              {stats.pendientes}
            </p>
          </div>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-card/40 p-4 rounded-t-2xl border border-white/20 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 w-full lg:w-1/3 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar concepto, banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card"
          />
        </div>
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setMovementFilter("all")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest",
              movementFilter === "all"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-500",
            )}
          >
            Libro Total
          </button>
          <button
            onClick={() => setMovementFilter("operativa")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex gap-2",
              movementFilter === "operativa"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500",
            )}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" /> Salidas
          </button>
          <button
            onClick={() => setMovementFilter("cobranza")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex gap-2",
              movementFilter === "cobranza"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500",
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
      <div className="relative w-full overflow-hidden rounded-b-2xl border border-slate-200/50 bg-card/30 backdrop-blur-sm shadow-xl liquid-glass-table">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <Table className="w-full text-sm">
            <TableHeader className="sticky top-0 z-20 backdrop-blur-xl bg-muted/80 border-b border-border">
              <TableRow className="border-none">
                <TableHead className="w-14 pl-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Conc.
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Fecha
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Concepto / Ref
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Origen
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Banco
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">
                  Monto
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center pr-6">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMovementsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-16 text-center">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-brand-navy/50" />
                  </TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    <Landmark className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    No hay movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow
                    key={mov.id}
                    className={cn(
                      "border-b border-border interactive-row",
                      mov.conciliado && "bg-emerald-50/30",
                    )}
                  >
                    <TableCell className="w-14 pl-6">
                      <Checkbox
                        checked={mov.conciliado}
                        onCheckedChange={() => handleToggleConciliacion(mov.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </TableCell>
                    <TableCell className="py-4 font-medium text-slate-500">
                      {mov.fecha}
                    </TableCell>
                    <TableCell className="py-4 max-w-[250px]">
                      <p className="font-bold text-slate-700 truncate">
                        {mov.concepto}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                        REF: {mov.referencia_bancaria || "N/A"}
                      </p>
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge
                        status={
                          mov.origen_modulo === "CxC"
                            ? "success"
                            : mov.origen_modulo === "CxP"
                              ? "danger"
                              : "info"
                        }
                      >
                        {mov.origen_modulo}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {bankLogos[mov.banco] || "🏦"}
                        </span>
                        <span className="text-sm font-bold text-slate-600">
                          {mov.banco}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span
                        className={cn(
                          "font-black font-mono text-sm",
                          mov.tipo === "ingreso"
                            ? "text-emerald-600"
                            : "text-rose-600",
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
                            className="h-8 w-8 hover:bg-slate-100 rounded-xl shadow-sm border bg-card/50"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="glass-panel border-border min-w-[160px] rounded-xl z-50"
                        >
                          <DropdownMenuItem
                            onClick={() => onViewMovement(mov)}
                            className="gap-2 font-bold text-xs uppercase cursor-pointer rounded-lg"
                          >
                            <Eye className="h-4 w-4" /> Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteMovement(mov)}
                            className="gap-2 font-bold text-xs uppercase text-rose-600 cursor-pointer rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
