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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  AlertTriangle,
  ArrowBigRight,
  User,
  Hash,
  FileCheck,
} from "lucide-react";
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
  invoice: any; // Factura completa "Mala"
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
      } else if (invoice.iva > 0) {
        setTipoImpuesto("MANIOBRA");
      } else {
        setTipoImpuesto("EXENTO");
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

    // 1. Armamos el payload clonando la info del cliente de la factura original
    // 2. INYECTAMOS SILENCIOSAMENTE EL UUID Y LA RELACIÓN 04
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
      if (invoice.viaje_id) {
        const nuevoFleteBase = conceptos[0]?.precioUnitario || 0;

        // Actualiza el precio del viaje en la BD
        await axiosClient.put(`/api/logistics/trips/${invoice.viaje_id}`, {
          tarifa_base: nuevoFleteBase,
        });

        // Manda la orden de refacturar (Carta Porte One-Shot)
        result = await generateOneShotInvoice({
          ...payload,
          viaje_id: invoice.viaje_id,
        });
      } else {
        // Factura Libre (Nomenclatura F)
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
        onSubmit();
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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 shrink-0">
              <ArrowBigRight className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase text-amber-900 dark:text-amber-500">
                Refacturar y Sustituir (Relación 04)
              </DialogTitle>
              <p className="text-[11px] font-bold uppercase text-amber-700/70 mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Sustituyendo automáticamente el
                UUID: {invoice.uuid}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              El sistema ya copió todos los datos del cliente y parámetros SAT
              de la factura original para tu tranquilidad.
              <strong>
                {" "}
                Solo corrige el Precio Unitario, las Cantidades o los Impuestos
                a continuación{" "}
              </strong>
              y el sistema hará la sustitución automáticamente.
            </p>
          </div>

          {/* DATOS DE LA FACTURA ORIGINAL (READ ONLY) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm text-xs">
            <div className="col-span-2 md:col-span-4 pb-2 border-b border-border">
              <h3 className="text-[10px] font-black text-brand-navy dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <User className="h-3 w-3" /> Datos del Cliente (No editables)
              </h3>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Razón Social
              </span>
              <span className="font-bold text-foreground truncate block">
                {invoice.client?.razon_social || "S/A"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                RFC
              </span>
              <span className="font-mono font-bold text-foreground">
                {invoice.client?.rfc || "S/A"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Régimen / CP
              </span>
              <span className="font-bold text-foreground">
                {invoice.client?.regimen_fiscal || "601"} - CP:{" "}
                {invoice.client?.codigo_postal_fiscal || "S/A"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Uso CFDI
              </span>
              <span className="font-bold text-foreground">
                {invoice.uso_cfdi || "G03"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Método Pago
              </span>
              <span className="font-bold text-foreground">
                {invoice.metodo_pago || "PPD"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Forma Pago
              </span>
              <span className="font-bold text-foreground">
                {invoice.forma_pago || "99"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-muted-foreground uppercase">
                Moneda
              </span>
              <span className="font-bold text-foreground">
                {invoice.moneda || "MXN"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border pb-2">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <FileCheck className="h-3 w-3" /> Corrección de Conceptos y
                Montos
              </h3>

              {/* SELECTOR DE IMPUESTOS */}
              <div className="w-full sm:w-64 space-y-1">
                <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                  Esquema de Impuestos
                </Label>
                <Select
                  value={tipoImpuesto}
                  onValueChange={(v: "FLETE" | "MANIOBRA" | "EXENTO") =>
                    setTipoImpuesto(v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs font-bold shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="FLETE"
                      className="font-bold text-xs text-emerald-600"
                    >
                      Flete (+16% IVA, -4% Ret)
                    </SelectItem>
                    <SelectItem
                      value="MANIOBRA"
                      className="font-bold text-xs text-blue-600"
                    >
                      Maniobras (+16% IVA)
                    </SelectItem>
                    <SelectItem
                      value="EXENTO"
                      className="font-bold text-xs text-slate-500"
                    >
                      Exento / Tasa 0%
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {conceptos.map((concepto, idx) => (
              <div
                key={concepto.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-card p-4 rounded-xl border border-border shadow-sm"
              >
                <div className="md:col-span-5 space-y-1.5">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">
                    Descripción del Servicio
                  </Label>
                  <Input
                    value={concepto.descripcion}
                    onChange={(e) =>
                      updateConcepto(concepto.id, "descripcion", e.target.value)
                    }
                    className="h-9 text-xs font-bold shadow-sm uppercase"
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
                  <Label className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    Precio Unitario
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
                    className="h-9 text-xs font-mono font-bold shadow-sm border-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/20"
                  />
                </div>
                <div className="md:col-span-3 text-right pb-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                    Importe Bruto
                  </span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
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

        <div className="p-6 bg-muted/50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono font-bold text-slate-500 flex flex-wrap gap-2 items-center">
            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-border">
              Sub: $
              {subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded shadow-sm border border-emerald-100 dark:border-emerald-900/30">
              IVA: ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded shadow-sm border border-rose-100 dark:border-rose-900/30">
              Ret: $
              {retenciones.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </span>

            <span className="block sm:inline sm:ml-4 text-lg text-foreground mt-2 sm:mt-0">
              Total Final:{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-black tracking-tighter">
                $
                {montoTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </span>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="uppercase text-[10px] font-black flex-1 sm:flex-none h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isStamping || montoTotal <= 0}
              className="uppercase text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex-1 sm:flex-none h-11"
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
