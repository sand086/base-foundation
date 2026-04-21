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
import {
  Receipt,
  Calendar,
  Landmark,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { BankMovement } from "@/features/treasury/types";
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
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-[520px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
                <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 dark:text-slate-400 drop-shadow-md" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Detalle Financiero
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  REGISTRY ID:{" "}
                  {movement.id?.toString().slice(-8).toUpperCase() || "N/A"}
                </p>
              </div>
            </div>
            <Badge
              variant={isIngreso ? "success" : "destructive"}
              className="h-7 px-3 text-[10px] font-black tracking-widest"
            >
              {isIngreso ? "INGRESO" : "EGRESO"}
            </Badge>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-6 mt-4">
          {/* Monto Card */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              {isIngreso ? (
                <ArrowUpRight size={80} />
              ) : (
                <ArrowDownLeft size={80} />
              )}
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Monto de la Operación
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-mono font-black tracking-tighter",
                  isIngreso
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-brand-red",
                )}
              >
                {isIngreso ? "+" : "-"}$
                {(movement.monto || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-bold text-muted-foreground uppercase tracking-widest">
                {movement.moneda || "MXN"}
              </span>
            </div>
          </div>

          {/* Concepto */}
          <div className="px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
              Concepto de Transacción
            </p>
            <p className="text-lg font-semibold text-foreground leading-tight">
              {movement.concepto || "Sin concepto especificado"}
            </p>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-2xl bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Afectación
                </span>
              </div>
              <p className="font-bold text-foreground">
                {movement.fecha || "S/F"}
              </p>
            </div>

            <div className="p-4 border border-border rounded-2xl bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Landmark className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Cuenta
                </span>
              </div>
              <p className="font-bold text-foreground leading-none mb-1">
                {movement.banco || "Banco no especificado"}
              </p>
              <p className="text-[10px] font-mono font-medium text-muted-foreground tracking-widest">
                {movement.cuenta_bancaria
                  ? `•••• ${movement.cuenta_bancaria.slice(-4)}`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Reference Block */}
          <div className="p-4 border border-amber-200 dark:border-amber-800/50 rounded-2xl bg-amber-50/40 dark:bg-amber-900/10 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Referencia Bancaria / SPEI
              </p>
              <p className="font-mono font-black text-foreground text-xl tracking-wider">
                {movement.referencia_bancaria || "SIN REFERENCIA"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground haptic-press"
              disabled={!movement.referencia_bancaria}
              onClick={() => {
                if (movement.referencia_bancaria) {
                  navigator.clipboard.writeText(movement.referencia_bancaria);
                }
              }}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Bar */}
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 shadow-inner",
              movement.conciliado
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-muted/50 border-border",
            )}
          >
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                movement.conciliado
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {movement.conciliado ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "font-black text-[11px] uppercase tracking-wider mb-1",
                  movement.conciliado
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {movement.conciliado ? "Conciliación Exitosa" : "Por Conciliar"}
              </p>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    movement.conciliado
                      ? "w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "w-1/3 bg-muted-foreground/40",
                  )}
                />
              </div>
            </div>
          </div>

          {/* Registro Footer */}
          <div className="flex justify-between items-center px-2 pt-2 border-t border-border opacity-80">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                BY:{" "}
                <span className="text-foreground">
                  {/* Se agregó fallback para registrado_por si no viene de backend */}
                  {(movement as any).registrado_por || "SISTEMA"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[9px]">
              <span className="bg-muted px-2 py-0.5 rounded border border-border">
                {/* Fallback de la fecha de registro o fecha principal */}
                {(movement as any).fecha_registro || movement.fecha || "S/F"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
