import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Landmark, Wallet, CheckCircle2 } from "lucide-react";
import { BankAccount } from "../types";

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
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-slate-200">
        {/* Cabecera decorativa */}
        <div className="bg-slate-50 p-8 text-center relative border-b border-slate-100">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-4xl mb-4 relative z-10">
            {account.banco_logo || "🏦"}
          </div>
          <DialogTitle className="text-2xl font-black text-brand-navy">
            {account.alias}
          </DialogTitle>
          <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {account.banco}
          </p>
          <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Activa
          </Badge>
        </div>

        {/* Detalles de la cuenta */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Número de Cuenta
              </p>
              <p className="font-mono font-bold text-slate-800">
                {account.numero_cuenta}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                CLABE Interbancaria
              </p>
              <p className="font-mono font-bold text-slate-800">
                {account.clabe || "No registrada"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Divisa Base
              </p>
              <p className="font-bold text-slate-800">{account.moneda}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Tipo de Flujo
              </p>
              <p className="font-bold capitalize text-slate-800">
                {account.tipo_cuenta}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                <Wallet className="w-5 h-5 text-brand-navy" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Saldo Actual
              </p>
            </div>
            <p className="text-xl font-black font-mono text-brand-navy">
              $
              {(account.saldo || 0).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
