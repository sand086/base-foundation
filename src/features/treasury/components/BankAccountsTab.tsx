import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Wallet,
  Eye,
  EyeOff,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Landmark,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankAccount } from "../types";
import { getBankLogo } from "../utils/bankUtils";

interface BankAccountsTabProps {
  bankAccounts: BankAccount[];
  isAccountsLoading: boolean;
  showBalances: boolean;
  setShowBalances: (show: boolean) => void;
  formatCurrency: (amount: number) => string;
  onAdd: () => void;
  onEdit: (account: BankAccount) => void;
  onView: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function BankAccountsTab({
  bankAccounts,
  isAccountsLoading,
  showBalances,
  setShowBalances,
  formatCurrency,
  onAdd,
  onEdit,
  onView,
  onDelete,
}: BankAccountsTabProps) {
  // =====================================================================
  // NUEVO FASE 3.1: CÁLCULO DE LIQUIDEZ TOTAL DE LA EMPRESA
  // =====================================================================
  const liquidezTotal = bankAccounts.reduce(
    // ✅ FIX: Usamos Math.abs() para sumar los saldos siempre en positivo
    (acc, curr) => acc + Math.abs(Number(curr.saldo) || 0),
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR SUPERIOR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/40 p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand-navy dark:text-slate-300" />
          Gestión de Tarjetas y Saldos
        </h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="h-11 flex-1 sm:flex-none gap-2 text-xs font-bold rounded-xl bg-card/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-slate-200 dark:border-white/10"
          >
            {showBalances ? (
              <EyeOff className="h-4 w-4 text-slate-500" />
            ) : (
              <Eye className="h-4 w-4 text-slate-500" />
            )}
            <span className="text-slate-600 dark:text-slate-300">
              {showBalances ? "Ocultar Saldos" : "Mostrar Saldos"}
            </span>
          </Button>
          <Button
            onClick={onAdd}
            className="h-11 flex-1 sm:flex-none gap-2 text-xs bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-xl shadow-lg shadow-brand-navy/20 transition-all"
          >
            <Plus className="h-4 w-4" /> Aperturar Cuenta
          </Button>
        </div>
      </div>

      {/* GRID DE TARJETAS BANCARIAS */}
      {isAccountsLoading ? (
        <div className="flex justify-center p-12 bg-card/40 rounded-2xl border border-border backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand-navy/50" />
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="text-center p-12 bg-card/40 backdrop-blur-sm rounded-2xl border border-border text-slate-500 font-bold uppercase tracking-widest text-sm flex flex-col items-center gap-3">
          <Wallet className="h-12 w-12 opacity-20" />
          <span>No hay cuentas registradas en este momento.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {bankAccounts.map((account) => {
            const logoSvg = getBankLogo(account.banco);

            return (
              <Card
                key={account.id}
                className="shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden relative border-slate-200 dark:border-white/10"
              >
                {/* Indicador visual de tipo de cuenta */}
                <div
                  className={cn(
                    "absolute top-0 left-0 w-1.5 h-full transition-colors",
                    account.tipo_cuenta === "operativa"
                      ? "bg-rose-500"
                      : "bg-emerald-500",
                  )}
                />

                {/* MENÚ DE ACCIONES */}
                <div className="absolute top-3 right-3 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/10 rounded-lg hover:text-brand-navy hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="glass-panel border-border min-w-[160px] z-50 rounded-xl dark:bg-slate-900/95 shadow-xl"
                    >
                      <DropdownMenuItem
                        onClick={() => onEdit(account)}
                        className="gap-2 font-bold text-xs uppercase cursor-pointer rounded-lg dark:text-slate-200"
                      >
                        <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                        Editar Cuenta
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="dark:bg-white/10" />

                      <DropdownMenuItem
                        onClick={() => onDelete(account)}
                        className="gap-2 font-bold text-xs uppercase text-rose-600 dark:text-rose-500 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" /> Archivar Cuenta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* CONTENIDO DE LA TARJETA */}
                <CardContent className="p-6 flex flex-col justify-between h-full pt-7">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner shrink-0">
                      {logoSvg ? (
                        <img
                          src={logoSvg}
                          alt={account.banco}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Landmark className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm pr-10 truncate">
                        {account.alias}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        {account.banco} • {account.moneda}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] uppercase font-black tracking-[0.2em] border-none shadow-sm",
                        account.tipo_cuenta === "operativa"
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                      )}
                    >
                      {account.tipo_cuenta}
                    </Badge>
                  </div>

                  <div className="space-y-1 mt-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                      Saldo Disponible
                    </p>
                    <p className="text-3xl font-mono font-black text-slate-800 dark:text-white tracking-tighter">
                      {/* ✅ FIX: Aplicamos Math.abs() antes de formatear para que no imprima el signo de menos */}
                      {showBalances
                        ? formatCurrency(Math.abs(account.saldo || 0))
                        : "••••••••"}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono tracking-widest">
                    <span>
                      CLABE:{" "}
                      {account.clabe ? `...${account.clabe.slice(-4)}` : "S/N"}
                    </span>
                    <span>CTA: *{account.numero_cuenta.slice(-4)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
