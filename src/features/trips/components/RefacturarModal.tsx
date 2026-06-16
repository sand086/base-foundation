import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Loader2, AlertTriangle, ArrowBigRight } from "lucide-react";
import { useBilling } from "@/features/receivables/hooks/useBilling";
import axiosClient from "@/api/axiosClient";
interface SmartInvoiceConcept {
  id: string;
  claveProdServ: string;
  claveUnidad: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

interface RefacturarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any; // Aquí pasaremos la factura completa "Mala"
  onSubmit: () => void;
}

export function RefacturarModal({
  open,
  onOpenChange,
  invoice,
  onSubmit,
}: RefacturarModalProps) {
  const { generateOneShotInvoice, generateFreeInvoice, isStamping } =
    useBilling();

  const [conceptos, setConceptos] = useState<SmartInvoiceConcept[]>([]);
  const [tipoImpuesto, setTipoImpuesto] = useState<
    "FLETE" | "MANIOBRA" | "EXENTO"
  >("FLETE");

  // Al abrir el modal, precargamos EXACTAMENTE los datos de la factura anterior
  useEffect(() => {
    if (open && invoice) {
      // Determinamos el tipo de impuesto basado en los montos de la factura original
      if (invoice.retenciones > 0) {
        setTipoImpuesto("FLETE");
      } else {
        setTipoImpuesto("MANIOBRA");
      }

      // Reconstruimos los conceptos (o creamos uno base si no vienen detallados)
      if (invoice.conceptos_detalle && invoice.conceptos_detalle.length > 0) {
        setConceptos(
          invoice.conceptos_detalle.map((c: any, idx: number) => ({
            id: `REF-${idx}-${Date.now()}`,
            claveProdServ: c.claveProdServ || "78101802",
            claveUnidad: c.claveUnidad || "E48",
            descripcion: c.descripcion || invoice.concepto || "Servicio",
            cantidad: Number(c.cantidad) || 1,
            precioUnitario: Number(c.precioUnitario) || Number(c.importe) || 0,
            importe: Number(c.importe) || 0,
          })),
        );
      } else {
        setConceptos([
          {
            id: `REF-0-${Date.now()}`,
            claveProdServ: "78101802",
            claveUnidad: "E48",
            descripcion: invoice.concepto || "FLETE CARGA GENERAL",
            cantidad: 1,
            precioUnitario: invoice.subtotal || 0,
            importe: invoice.subtotal || 0,
          },
        ]);
      }
    }
  }, [open, invoice]);

  // Cálculos en tiempo real
  const subtotal = useMemo(
    () => conceptos.reduce((sum, c) => sum + c.importe, 0),
    [conceptos],
  );
  const iva = useMemo(
    () => (tipoImpuesto !== "EXENTO" ? subtotal * 0.16 : 0),
    [subtotal, tipoImpuesto],
  );
  const retenciones = useMemo(
    () => (tipoImpuesto === "FLETE" ? subtotal * 0.04 : 0),
    [subtotal, tipoImpuesto],
  );
  const montoTotal = useMemo(
    () => subtotal + iva - retenciones,
    [subtotal, iva, retenciones],
  );

  const updateConcepto = (
    id: string,
    field: keyof SmartInvoiceConcept,
    value: string | number,
  ) => {
    setConceptos(
      conceptos.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === "cantidad" || field === "precioUnitario") {
            updated.importe =
              Number(updated.cantidad) * Number(updated.precioUnitario);
          }
          return updated;
        }
        return c;
      }),
    );
  };

  const handleSubmit = async () => {
    if (!invoice || conceptos.length === 0 || montoTotal <= 0) {
      toast.error("Error en los montos", {
        description: "El total de la factura debe ser mayor a 0.",
      });
      return;
    }

    const payload = {
      client_id: invoice.client_id || invoice.client?.id,
      sub_client_id: invoice.sub_client_id,
      cliente: invoice.client?.razon_social || "",
      cliente_rfc: invoice.client?.rfc || "XAXX010101000",
      cp_receptor: invoice.client?.codigo_postal_fiscal || "",
      regimen_fiscal_receptor: invoice.client?.regimen_fiscal || "601",
      uso_cfdi: invoice.uso_cfdi || "G03",
      conceptos,
      subtotal,
      iva,
      retenciones,
      monto_total: montoTotal,
      moneda: invoice.moneda || "MXN",
      fecha_emision: new Date().toISOString().split("T")[0],
      fecha_vencimiento: new Date(
        new Date().setDate(
          new Date().getDate() + (invoice.client?.dias_credito || 0),
        ),
      )
        .toISOString()
        .split("T")[0],
      metodo_pago: invoice.metodo_pago || "PPD",
      forma_pago: invoice.forma_pago || "99",
      uuid_relacionado: invoice.uuid, // EL TRUCO ESTÁ AQUÍ
      tipo_relacion: "04", // Y AQUÍ
    };

    let result;

    try {
      // 🚨 LA MAGIA OPERATIVA 🚨
      // Si la factura original viene de un viaje (Tiene Carta Porte)
      if (invoice.viaje_id) {
        // 1. Tomamos el nuevo precio que el usuario acaba de corregir en el modal
        const nuevoFleteBase = conceptos[0]?.precioUnitario || 0;

        // 2. Le decimos a la base de datos: "Actualiza el precio del viaje antes de timbrar"
        await axiosClient.put(`/api/logistics/trips/${invoice.viaje_id}`, {
          tarifa_base: nuevoFleteBase,
        });

        // 3. Ahora sí, con la BD actualizada, mandamos la orden de refacturar (One-Shot)
        result = await generateOneShotInvoice({
          ...payload,
          viaje_id: invoice.viaje_id,
        });
      } else {
        // Si la factura original era Libre (Nomenclatura F), el backend lee directo el payload
        result = await generateFreeInvoice(payload);
      }

      if (result) {
        toast.success("¡Sustitución Exitosa!", {
          description:
            "Se generó la nueva factura y se mandó a cancelar la anterior en el SAT.",
        });
        if (result.data && result.data.uuid) {
          window.open(`/api/sat/invoice/${result.data.uuid}/pdf`, "_blank");
        }
        onSubmit(); // Esto recargará los datos del viaje en el TripDetailsModal
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Ocurrió un error al procesar la refacturación.");
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl p-0 flex flex-col max-h-[90vh] bg-card overflow-hidden">
        <DialogHeader className="p-6 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
              <ArrowBigRight className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase text-amber-900 dark:text-amber-500">
                Refacturar y Sustituir (Relación 04)
              </DialogTitle>
              <p className="text-[11px] font-bold uppercase text-amber-700/70 mt-1">
                Sustituyendo automáticamente el UUID: {invoice.uuid}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              El sistema ya copió todos los datos del cliente y SAT de la
              factura original.
              <strong>
                {" "}
                Solo corrige el Precio Unitario o las Cantidades a
                continuación{" "}
              </strong>
              y el sistema hará la sustitución automáticamente.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
              Corrección de Montos
            </h3>

            {conceptos.map((concepto, idx) => (
              <div
                key={concepto.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-card p-4 rounded-xl border border-border shadow-sm"
              >
                <div className="md:col-span-5 space-y-1.5">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                    Descripción
                  </Label>
                  <Input
                    value={concepto.descripcion}
                    onChange={(e) =>
                      updateConcepto(concepto.id, "descripcion", e.target.value)
                    }
                    className="h-9 text-xs font-bold shadow-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                    Cantidad
                  </Label>
                  <Input
                    type="number"
                    value={concepto.cantidad}
                    onChange={(e) =>
                      updateConcepto(
                        concepto.id,
                        "cantidad",
                        Number(e.target.value),
                      )
                    }
                    className="h-9 text-xs font-mono text-center shadow-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase text-indigo-600">
                    Nuevo Precio
                  </Label>
                  <Input
                    type="number"
                    value={concepto.precioUnitario}
                    onChange={(e) =>
                      updateConcepto(
                        concepto.id,
                        "precioUnitario",
                        Number(e.target.value),
                      )
                    }
                    className="h-9 text-xs font-mono font-bold shadow-sm border-indigo-300 bg-indigo-50/30"
                  />
                </div>
                <div className="md:col-span-3 text-right pb-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                    Importe
                  </span>
                  <span className="font-mono font-black text-indigo-600">
                    $
                    {concepto.importe.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-muted/50 border-t border-border flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-500">
            Sub: ${subtotal.toLocaleString()} | IVA: ${iva.toLocaleString()} |
            Ret: ${retenciones.toLocaleString()}
            <span className="block text-lg text-foreground mt-1">
              Total Corregido:{" "}
              <span className="text-indigo-600">
                $
                {montoTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="uppercase text-[10px] font-black"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isStamping || montoTotal <= 0}
              className="uppercase text-[10px] font-black bg-indigo-600 hover:bg-indigo-700"
            >
              {isStamping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando...
                </>
              ) : (
                "Generar y Sustituir"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
