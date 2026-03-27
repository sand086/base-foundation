import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Receipt,
  Calendar,
  User,
  Link2,
  Landmark,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BankMovement } from "@/types/api.types";

interface MovementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: BankMovement | null; // 🚀 2. USAMOS EL TIPO REAL
}

export function MovementDetailModal({
  open,
  onOpenChange,
  movement,
}: MovementDetailModalProps) {
  const navigate = useNavigate();

  if (!movement) return null;

  const isIngreso = movement.tipo === "ingreso";

  // 🚀 3. LOGICA DE NAVEGACIÓN BASADA EN EL MÓDULO REAL
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
      <DialogContent className="sm:max-w-[480px] rounded-2xl overflow-hidden p-0 border-slate-200">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-brand-navy font-black text-xl">
            <Receipt className="h-6 w-6 text-brand-blue" />
            Detalle del Movimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Header with Amount */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
            <div>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Monto de la Operación
              </p>
              <p
                className={`text-3xl font-black font-mono mt-1 tracking-tighter ${isIngreso ? "text-emerald-600" : "text-red-600"}`}
              >
                {isIngreso ? "+" : "-"}${movement.monto.toLocaleString("es-MX")}
                <span className="text-sm ml-1 opacity-70">
                  {movement.moneda}
                </span>
              </p>
            </div>
            <StatusBadge status={isIngreso ? "success" : "danger"}>
              {isIngreso ? "INGRESO" : "EGRESO"}
            </StatusBadge>
          </div>

          {/* Concepto */}
          <div className="px-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">
              Concepto de la Transacción
            </p>
            <p className="text-base font-bold text-slate-800 leading-snug">
              {movement.concepto}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                <Calendar className="h-3.5 w-3.5" /> Fecha Afectación
              </div>
              <p className="font-bold text-slate-700">{movement.fecha}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                <Landmark className="h-3.5 w-3.5" /> Cuenta
              </div>
              <p className="font-bold text-slate-700 leading-tight">
                {movement.banco}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                ••{movement.cuenta_bancaria.slice(-4)}
              </p>
            </div>
          </div>

          {/* Referencia Bancaria */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-widest mb-1">
                Referencia Bancaria / SPEI
              </p>
              <p className="font-mono font-black text-amber-800 text-lg tracking-wider">
                {movement.referencia_bancaria}
              </p>
            </div>
          </div>

          {/* Origen/Módulo */}
          <div className="flex items-center justify-between p-4 bg-sky-50 rounded-xl border border-sky-100">
            <div>
              <p className="text-[10px] text-sky-600/70 font-bold uppercase tracking-widest mb-1">
                Origen / Módulo
              </p>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md text-xs">
                  {movement.origen_modulo}
                </p>
                {movement.factura_folio && (
                  <p className="text-xs text-sky-700 font-mono font-bold border-l border-sky-200 pl-2">
                    FOLIO: {movement.factura_folio}
                  </p>
                )}
              </div>
            </div>
            {movement.factura_relacionada && getModuleRoute() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToInvoice}
                className="gap-1.5 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800 rounded-lg shadow-sm"
              >
                <Link2 className="h-3.5 w-3.5" />
                Ver Factura
              </Button>
            )}
          </div>

          {/* Auditoría (Registrado Por) */}
          <div className="grid grid-cols-2 gap-4 px-1">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">
                <User className="h-3 w-3" /> Registrado por
              </div>
              <p className="font-bold text-slate-600 text-xs">
                {movement.registrado_por}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">
                <FileText className="h-3 w-3" /> Fecha Registro
              </div>
              <p className="font-bold text-slate-600 text-xs">
                {movement.fecha_registro}
              </p>
            </div>
          </div>

          {/* Conciliation Status */}
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border shadow-inner mt-2 ${
              movement.conciliado
                ? "bg-emerald-50/50 border-emerald-100"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            {movement.conciliado ? (
              <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-slate-500" />
              </div>
            )}
            <div>
              <p
                className={`font-black text-sm uppercase tracking-wide ${movement.conciliado ? "text-emerald-700" : "text-slate-600"}`}
              >
                {movement.conciliado
                  ? "Movimiento Conciliado"
                  : "Pendiente de Conciliar"}
              </p>
              {movement.fecha_conciliacion ? (
                <p className="text-[11px] font-bold text-emerald-600/70 mt-0.5">
                  Validado por tesorería el {movement.fecha_conciliacion}
                </p>
              ) : (
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Esperando validación contra estado de cuenta
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
