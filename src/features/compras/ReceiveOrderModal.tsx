import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Package, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrder, getOrderTypeLabel } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReceiveOrderModalProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceive: (orderId: string, completo: boolean, notas: string) => void;
}

export function ReceiveOrderModal({ order, open, onOpenChange, onReceive }: ReceiveOrderModalProps) {
  const [recepcionCompleta, setRecepcionCompleta] = useState(true);
  const [notas, setNotas] = useState("");

  if (!order) return null;

  const handleReceive = () => {
    onReceive(order.id, recepcionCompleta, notas);
    setRecepcionCompleta(true);
    setNotas("");
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: order.moneda,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Recibir Orden
          </DialogTitle>
          <DialogDescription>
            Confirma la recepción de {order.folio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Folio</span>
              <span className="font-mono font-medium">{order.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Proveedor</span>
              <span className="font-medium">{order.proveedorNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-mono font-semibold text-primary">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Items List */}
          {order.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Ítems a recibir:</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm p-2 bg-background rounded">
                    <span>{item.descripcion}</span>
                    <span className="text-muted-foreground">{item.cantidad} {item.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Reception Confirmation */}
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="completo" 
              checked={recepcionCompleta}
              onCheckedChange={(c) => setRecepcionCompleta(c === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="completo"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                ¿Se recibió completo?
              </label>
              <p className="text-xs text-muted-foreground">
                Marca si todos los ítems/servicios fueron recibidos según lo solicitado.
              </p>
            </div>
          </div>

          {!recepcionCompleta && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Recepción parcial</p>
                  <p className="text-xs">Describe qué faltó en las notas</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas de recepción (opcional)</Label>
            <Textarea
              placeholder="Observaciones, faltantes, daños, etc."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <ActionButton onClick={handleReceive}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Recepción
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Convert to CxP Modal - Now creates the actual CxP record
interface ConvertToCxPModalProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (orderId: string) => void;
}

export function ConvertToCxPModal({ order, open, onOpenChange, onConvert }: ConvertToCxPModalProps) {
  const navigate = useNavigate();

  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: order.moneda,
    }).format(amount);
  };

  const handleConvert = () => {
    // Mark order as converted
    onConvert(order.id);
    onOpenChange(false);

    // Navigate to CxP with prefilled data
    const params = new URLSearchParams({
      fromCompras: 'true',
      proveedor: order.proveedorNombre,
      proveedorId: order.proveedorId,
      concepto: order.descripcionServicio || order.items.map(i => i.descripcion).join(', ') || `Orden ${order.folio}`,
      monto: String(order.total),
      ordenId: order.id,
      ordenFolio: order.folio,
    });

    navigate(`/proveedores?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Convertir a Cuenta por Pagar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Al convertir esta orden a CxP, se abrirá el formulario de registro de factura con los datos pre-llenados. 
            Solo faltará ingresar el <strong>UUID/Folio Fiscal</strong> y subir los archivos PDF/XML.
          </p>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Orden origen</span>
              <span className="font-mono font-medium text-blue-900">{order.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Proveedor</span>
              <span className="font-medium text-blue-900">{order.proveedorNombre}</span>
            </div>
            <Separator className="bg-blue-200" />
            <div className="flex justify-between">
              <span className="text-sm font-medium text-blue-700">Monto a pagar</span>
              <span className="font-mono font-bold text-blue-900 text-lg">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">Próximos pasos:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Seleccionar la <strong>Clasificación Financiera</strong></li>
              <li>Ingresar el UUID de la factura del proveedor</li>
              <li>Subir PDF y XML de la factura</li>
              <li>Programar el pago según días de crédito</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <ActionButton onClick={handleConvert}>
            Ir a Registrar Factura
            <ArrowRight className="h-4 w-4 ml-2" />
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
