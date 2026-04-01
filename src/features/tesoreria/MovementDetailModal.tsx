import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Receipt,
  Calendar,
  Landmark,
  Link2,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { BankMovement } from "@/types/api.types";
import { cn } from "@/lib/utils";

interface MovementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: BankMovement | null;
}

export function MovementDetailModal({
  open,
  onOpenChange,
  movement,
}: MovementDetailModalProps) {
  const navigate = useNavigate();

  if (!movement) return null;

  // Ajuste de lógica: Validamos por tipo o por monto si el tipo no viene
  const isIngreso = movement.tipo === "ingreso" || movement.monto > 0;

  const getModuleRoute = () => {
    if (movement.origen_modulo === "CxC") return "/cuentas-por-cobrar";
    if (movement.origen_modulo === "CxP") return "/proveedores-cxp";
    return null;
  };

  const handleGoToInvoice = () => {
    const route = getModuleRoute();
    if (route) {
      navigate(route);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-white/20 shadow-2xl transition-all duration-500 ring-1 ring-black/5">
        {/* Header: macOS Tahoe Layout */}
        <DialogHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-white/10 bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-brand-navy to-brand-blue rounded-xl shadow-lg shadow-brand-blue/20 ring-1 ring-white/30">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
                Detalle Financiero
              </DialogTitle>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500/80">
                REGISTRY ID:{" "}
                {movement.id?.toString().slice(-8).toUpperCase() || "N/A"}
              </p>
            </div>
          </div>
          {/*  FIX: Cambiado "danger" por "destructive" para cumplir con el contrato de TS */}
          <Badge
            variant={isIngreso ? "success" : "destructive"}
            className="h-7 px-3 text-[10px] font-bold tracking-widest border border-white/20 backdrop-blur-md shadow-sm"
          >
            {isIngreso ? "INGRESO" : "EGRESO"}
          </Badge>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Main Amount Card - Bento LCD Style */}
          <Card
            variant="glass"
            className="relative overflow-hidden p-6 border-white/40 bg-white/50 dark:bg-slate-900/40"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              {isIngreso ? (
                <ArrowUpRight size={80} />
              ) : (
                <ArrowDownLeft size={80} />
              )}
            </div>

            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-slate-400 block mb-2">
              Monto de la Operación
            </label>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-mono font-black tracking-tighter",
                  isIngreso ? "text-emerald-600" : "text-brand-red",
                )}
              >
                {isIngreso ? "+" : "-"}$
                {movement.monto.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-bold text-slate-400 uppercase tracking-widest">
                {movement.moneda}
              </span>
            </div>
          </Card>

          {/* Industrial Data Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-1.5">
                Concepto de Transacción
              </label>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {movement.concepto}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card variant="glass" className="p-4 bg-white/30 border-white/20">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Afectación
                  </span>
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {movement.fecha}
                </p>
              </Card>

              <Card variant="glass" className="p-4 bg-white/30 border-white/20">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Landmark className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Cuenta
                  </span>
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300 leading-none mb-1">
                  {movement.banco}
                </p>
                <p className="text-[10px] font-mono font-medium text-slate-500">
                  •••• {movement.cuenta_bancaria?.slice(-4)}
                </p>
              </Card>
            </div>
          </div>

          {/* Reference Block */}
          <div className="relative group haptic-press">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-xl blur-sm opacity-50 transition duration-1000"></div>
            <div className="relative p-4 bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/50 rounded-xl flex justify-between items-center backdrop-blur-sm">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700/70 block mb-1">
                  Referencia Bancaria / SPEI
                </label>
                <p className="font-mono font-black text-amber-800 dark:text-amber-500 text-xl tracking-wider">
                  {movement.referencia_bancaria}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-amber-700 hover:bg-amber-200/50"
                onClick={() =>
                  navigator.clipboard.writeText(movement.referencia_bancaria)
                }
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status & Validation Bar */}
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 shadow-inner",
              movement.conciliado
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-slate-100/50 border-slate-200 dark:bg-slate-800/50 dark:border-white/10",
            )}
          >
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                movement.conciliado
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-500",
              )}
            >
              {movement.conciliado ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p
                  className={cn(
                    "font-black text-[11px] uppercase tracking-wider",
                    movement.conciliado
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-500",
                  )}
                >
                  {movement.conciliado
                    ? "Conciliación Exitosa"
                    : "Por Conciliar"}
                </p>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    movement.conciliado
                      ? "w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "w-1/3 bg-slate-400",
                  )}
                />
              </div>
            </div>
          </div>

          {/* Footer Auditoría */}
          <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-100 dark:border-white/5 opacity-80">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                BY:{" "}
                <span className="text-slate-800 dark:text-slate-300">
                  {movement.registrado_por}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[9px]">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {movement.fecha_registro}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
