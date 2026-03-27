import {
  Receipt,
  CheckCircle,
  Download,
  Printer,
  User,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ConceptoPago, TripSettlement } from "@/types/api.types";

interface SettlementReceiptModalProps {
  open: boolean;
  onClose: () => void;
  settlement: TripSettlement;
  authorizationDate: string;
  authorizationUser: string;
}

export function SettlementReceiptModal({
  open,
  onClose,
  settlement,
  authorizationDate,
  authorizationUser,
}: SettlementReceiptModalProps) {
  // Helper para formato de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // Separar ingresos y deducciones
  const ingresos = settlement.conceptos.filter((c) => c.tipo === "ingreso");
  const deducciones = settlement.conceptos.filter(
    (c) => c.tipo === "deduccion",
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <Receipt className="h-5 w-5" />
            Recibo de Liquidación
          </DialogTitle>
          <DialogDescription>Comprobante de pago autorizado</DialogDescription>
        </DialogHeader>

        {/* Receipt Content */}
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
          {/* Header del Recibo */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-brand-navy flex justify-center items-center">
              <img src="/logo-white.svg" alt="3T Logistics" className="h-6" />
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sistema de Gestión de Transporte
            </p>
            <Badge className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              LIQUIDADO
            </Badge>
          </div>

          {/* Información del Viaje */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-600" />
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Folio Viaje:
                </span>
                <span className="font-bold text-slate-700">
                  {settlement.trip_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-600" />
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Operador:
                </span>
                <span className="font-bold text-slate-700">
                  {settlement.operador_nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-600" />
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Unidad:
                </span>
                <span className="font-mono font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded">
                  ECO-{settlement.unidad_numero}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-600" />
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Ruta:
                </span>
                <span
                  className="font-bold text-slate-700 truncate"
                  title={settlement.ruta}
                >
                  {settlement.ruta}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600" />
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  Fecha:
                </span>
                <span className="font-bold text-slate-700">
                  {settlement.fecha_viaje}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider ml-6">
                  Kms:
                </span>
                <span className="font-bold text-slate-700">
                  {(settlement.kms_recorridos || 0).toLocaleString()} km
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección de Ingresos */}
          <div>
            <h3 className="font-black text-emerald-600 mb-3 flex items-center gap-2 uppercase tracking-widest text-sm">
              <DollarSign className="h-4 w-4" /> Ingresos
            </h3>
            <div className="space-y-2.5">
              {ingresos.map((concepto) => (
                <div
                  key={concepto.id}
                  className="flex justify-between text-sm items-center"
                >
                  <div>
                    <span className="font-medium text-slate-700">
                      {concepto.descripcion}
                    </span>
                    {concepto.referencia && (
                      <span className="text-slate-600 text-xs ml-2 italic">
                        ({concepto.referencia})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-600">
                    +{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-3 border-t border-slate-100 mt-2">
                <span className="text-slate-600 uppercase text-xs tracking-wider">
                  Subtotal Ingresos
                </span>
                <span className="font-mono text-emerald-600 text-base">
                  {formatCurrency(settlement.total_ingresos)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección de Deducciones */}
          <div>
            <h3 className="font-black text-red-600 mb-3 flex items-center gap-2 uppercase tracking-widest text-sm">
              <DollarSign className="h-4 w-4" /> Deducciones
            </h3>
            <div className="space-y-2.5">
              {deducciones.map((concepto) => (
                <div
                  key={concepto.id}
                  className="flex justify-between text-sm items-center"
                >
                  <div>
                    <span
                      className={cn(
                        "font-medium text-slate-700",
                        concepto.categoria === "combustible"
                          ? "text-red-600"
                          : "",
                      )}
                    >
                      {concepto.descripcion}
                    </span>
                    {concepto.referencia && (
                      <span className="text-slate-600 text-xs ml-2 italic">
                        ({concepto.referencia})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-red-600">
                    -{formatCurrency(concepto.monto)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-3 border-t border-slate-100 mt-2">
                <span className="text-slate-600 uppercase text-xs tracking-wider">
                  Subtotal Deducciones
                </span>
                <span className="font-mono text-red-600 text-base">
                  -{formatCurrency(settlement.total_deducciones)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="border-2" />

          {/* Total a Pagar */}
          <div className="bg-brand-navy rounded-xl p-5 text-white shadow-md">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-black tracking-widest uppercase opacity-80">
                  NETO A PAGAR
                </span>
                <p className="text-xs text-white/70 mt-1">
                  Aut: {authorizationDate} por {authorizationUser}
                </p>
              </div>
              <span className="text-3xl font-black font-mono">
                {formatCurrency(settlement.neto_a_pagar)}
              </span>
            </div>
          </div>

          {/* Footer del recibo */}
          <div className="text-center text-xs text-slate-600 pt-6 border-t border-dashed">
            <p>
              Este documento es un comprobante de liquidación generado y
              validado automáticamente.
            </p>
            <p className="mt-2 flex items-center justify-center gap-2 font-bold">
              <img
                src="/logo-white.svg"
                alt="3T Logistics"
                className="h-4 opacity-50 grayscale"
              />
              © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" className="gap-2 rounded-xl text-slate-600">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl text-slate-600">
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button
            onClick={onClose}
            className="rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90 px-8"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
