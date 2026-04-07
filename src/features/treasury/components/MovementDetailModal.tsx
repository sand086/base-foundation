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
import { BankAccount, BankMovement } from "@/features/treasury/types";
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
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-card/70 backdrop-blur-2xl border-border shadow-2xl transition-all duration-500 ring-1 ring-border">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-brand-navy to-brand-blue rounded-xl shadow-lg shadow-brand-blue/20 ring-1 ring-white/30">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                Detalle Financiero
              </DialogTitle>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                REGISTRY ID:{" "}
                {movement.id?.toString().slice(-8).toUpperCase() || "N/A"}
              </p>
            </div>
          </div>
          <Badge
            variant={isIngreso ? "success" : "destructive"}
            className="h-7 px-3 text-[10px] font-bold tracking-widest border border-border backdrop-blur-md shadow-sm"
          >
            {isIngreso ? "INGRESO" : "EGRESO"}
          </Badge>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Main Amount Card */}
          <Card
            variant="glass"
            className="relative overflow-hidden p-6 border-border bg-card/50"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              {isIngreso ? (
                <ArrowUpRight size={80} />
              ) : (
                <ArrowDownLeft size={80} />
              )}
            </div>

            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
              Monto de la Operación
            </label>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-mono font-black tracking-tighter",
                  isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-brand-red",
                )}
              >
                {isIngreso ? "+" : "-"}$
                {movement.monto.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-bold text-muted-foreground uppercase tracking-widest">
                {movement.moneda}
              </span>
            </div>
          </Card>

          {/* Data Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                Concepto de Transacción
              </label>
              <p className="text-lg font-semibold text-foreground leading-tight">
                {movement.concepto}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card variant="glass" className="p-4 bg-card/30 border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Afectación
                  </span>
                </div>
                <p className="font-bold text-foreground">
                  {movement.fecha}
                </p>
              </Card>

              <Card variant="glass" className="p-4 bg-card/30 border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Landmark className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Cuenta
                  </span>
                </div>
                <p className="font-bold text-foreground leading-none mb-1">
                  {movement.banco}
                </p>
                <p className="text-[10px] font-mono font-medium text-muted-foreground">
                  •••• {movement.cuenta_bancaria?.slice(-4)}
                </p>
              </Card>
            </div>
          </div>

          {/* Reference Block */}
          <div className="relative group haptic-press">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-xl blur-sm opacity-50 transition duration-1000"></div>
            <div className="relative p-4 bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-xl flex justify-between items-center backdrop-blur-sm">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700/70 dark:text-amber-500/70 block mb-1">
                  Referencia Bancaria / SPEI
                </label>
                <p className="font-mono font-black text-amber-800 dark:text-amber-400 text-xl tracking-wider">
                  {movement.referencia_bancaria}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-amber-700 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/30"
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
              <div className="flex justify-between items-center mb-1">
                <p
                  className={cn(
                    "font-black text-[11px] uppercase tracking-wider",
                    movement.conciliado
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {movement.conciliado
                    ? "Conciliación Exitosa"
                    : "Por Conciliar"}
                </p>
              </div>
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

          {/* Footer Auditoría */}
          <div className="flex justify-between items-center px-2 pt-2 border-t border-border opacity-80">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                BY:{" "}
                <span className="text-foreground">
                  {movement.registrado_por}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[9px]">
              <span className="bg-muted px-2 py-0.5 rounded border border-border">
                {movement.fecha_registro}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
