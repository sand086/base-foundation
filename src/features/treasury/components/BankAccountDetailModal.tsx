import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Landmark, Wallet, CheckCircle2 } from "lucide-react";
import { BankAccount } from "../types";
import { Button } from "@/components/ui/button";

interface BankAccountDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount | null;
}

export function BankAccountDetailModal({
  open,
  onOpenChange,
  account,
}: BankAccountDetailModalProps) {
  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-[480px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-4xl">
              {account.banco_logo || "🏦"}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {account.alias}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {account.banco}
              </p>
            </div>
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Activa
            </Badge>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
          {/* Tarjeta: Datos de Cuenta */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  Número de Cuenta
                </p>
                <p className="font-mono font-bold text-foreground tracking-widest">
                  {account.numero_cuenta}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  CLABE Interbancaria
                </p>
                <p className="font-mono font-bold text-foreground tracking-widest">
                  {account.clabe || "No registrada"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  Divisa Base
                </p>
                <p className="font-bold text-foreground uppercase">{account.moneda}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  Tipo de Flujo
                </p>
                <p className="font-bold capitalize text-foreground uppercase">
                  {account.tipo_cuenta}
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta: Saldo */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center bg-muted border border-border">
                  <Wallet className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  Saldo Actual
                </p>
              </div>
              <p className="text-xl font-black font-mono text-foreground tracking-tighter">
                $
                {(account.saldo || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* CAPA 5: FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar Detalles
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
