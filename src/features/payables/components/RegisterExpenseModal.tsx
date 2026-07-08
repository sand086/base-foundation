import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Calendar,
  DollarSign,
  AlertCircle,
  Plus,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  PayableInvoice,
  IndirectCategory,
  FinancialClassification,
  RegisterExpensePayload,
  PrefillData as BasePrefillData, // El tipo global original
} from "@/features/payables/types";
import { PurchaseOrder, getOrderTypeLabel } from "@/features/purchases/types";
import { Trip } from "@/features/trips/types";
import { Supplier } from "@/features/suppliers/types";
import { Unit } from "@/features/units/types";

// Extensión para que acepte los campos del XML
export interface LocalPrefillData extends Partial<BasePrefillData> {
  proveedor?: string;
  proveedorId?: string;
  concepto?: string;
  montoTotal?: number;
  ordenCompraId?: string;
  ordenCompraFolio?: string;
  uuid?: string;
  fecha_emision?: string;
  xml_file?: File | null;
}

export type UploadResult = {
  url: string;
  filename?: string;
};

// =====================
// Props
// =====================
interface RegisterExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: RegisterExpensePayload) => void | Promise<void>;
  suppliers: Supplier[];
  editInvoice?: PayableInvoice | null;
  prefillData?: LocalPrefillData | null;
  trips?: Trip[];
  units?: Unit[];
  indirectCategories?: IndirectCategory[];
  onCreateIndirectCategory?: (input: {
    nombre: string;
    tipo: "fijo" | "variable";
  }) => Promise<IndirectCategory | null>;
  onUploadPdf?: (file: File) => Promise<UploadResult>;
  onUploadXml?: (file: File) => Promise<UploadResult>;
  creditDaysOptions?: Array<{ value: number; label: string }>;
}

const defaultCreditDaysOptions = [
  { value: 0, label: "0 días (contado)" },
  { value: 7, label: "7 días" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
  { value: 45, label: "45 días" },
  { value: 60, label: "60 días" },
  { value: 90, label: "90 días" },
];

const yyyyMmDdToday = () => new Date().toISOString().split("T")[0];

const toIntOrNull = (v: string) => {
  if (!v || v === "none") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const toIntOrZero = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const normalizeMoney = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const calculateDueDate = (emision: string, dias: number): string => {
  if (!emision) return "";
  const date = new Date(emision + "T00:00:00");
  date.setDate(date.getDate() + dias);
  return date.toISOString().split("T")[0];
};

export function RegisterExpenseModal({
  open,
  onOpenChange,
  onSubmit,
  suppliers,
  editInvoice,
  prefillData,
  trips = [],
  units = [],
  indirectCategories = [],
  onCreateIndirectCategory,
  onUploadPdf,
  onUploadXml,
  creditDaysOptions = defaultCreditDaysOptions,
}: RegisterExpenseModalProps) {
  const [formData, setFormData] = useState<{
    supplier_id: string;
    concepto: string;
    monto_total: number;
    fecha_emision: string;
    dias_credito: number;
    moneda: "MXN" | "USD";
    uuid: string;
    clasificacion: FinancialClassification | "";
    viaje_id: string;
    unidad_id: string;
    categoria_indirecto_id: string;
    orden_compra_id: string;
    orden_compra_folio: string;
    pdf_url: string;
    xml_url: string;
    pdf_file: File | null;
    xml_file: File | null;
  }>({
    supplier_id: "none", // Por defecto "none" (Caja chica / Sin proveedor)
    concepto: "",
    monto_total: 0,
    fecha_emision: yyyyMmDdToday(),
    dias_credito: 0, // Por defecto al contado
    moneda: "MXN",
    uuid: "",
    clasificacion: "",
    viaje_id: "",
    unidad_id: "",
    categoria_indirecto_id: "",
    orden_compra_id: "",
    orden_compra_folio: "",
    pdf_url: "",
    xml_url: "",
    pdf_file: null,
    xml_file: null,
  });

  const [fecha_vencimiento, setFechaVencimiento] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingXml, setUploadingXml] = useState(false);

  const isLockedByPayments = useMemo(() => {
    if (!editInvoice) return false;
    const estatus = editInvoice.estatus;
    const saldo = editInvoice.saldo_pendiente;
    const monto = editInvoice.monto_total;

    if (estatus === "pagado" || estatus === "pago_parcial") return true;
    if (typeof saldo === "number" && typeof monto === "number" && saldo < monto)
      return true;

    const pagos = editInvoice.payments ?? [];
    return pagos.length > 0;
  }, [editInvoice]);

  const isProviderLocked = isLockedByPayments;
  const isAmountLocked = isLockedByPayments;

  useEffect(() => {
    if (formData.fecha_emision && Number.isFinite(formData.dias_credito)) {
      setFechaVencimiento(
        calculateDueDate(formData.fecha_emision, formData.dias_credito),
      );
    }
  }, [formData.fecha_emision, formData.dias_credito]);

  // Prefill Purchases o Importación XML
  useEffect(() => {
    if (!open || !prefillData) return;

    // Buscar si el proveedor existe en la base de datos (Por ID o aproximando el nombre del XML)
    const byId = toIntOrNull(prefillData.proveedorId || "");
    const supplierById = byId ? suppliers.find((s) => s.id === byId) : null;
    const supplierByName =
      supplierById ||
      suppliers.find((s) =>
        s.razon_social
          .trim()
          .toLowerCase()
          .includes((prefillData.proveedor || "").trim().toLowerCase()),
      ) ||
      null;

    setFormData((prev) => ({
      ...prev,
      supplier_id: supplierByName
        ? String(supplierByName.id)
        : prev.supplier_id,
      concepto: prefillData.concepto ?? prev.concepto,
      monto_total: Number(prefillData.montoTotal ?? prev.monto_total),
      orden_compra_id: prefillData.ordenCompraId ?? prev.orden_compra_id,
      orden_compra_folio:
        prefillData.ordenCompraFolio ?? prev.orden_compra_folio,
      // FIX: Inyectamos los datos del XML
      uuid: prefillData.uuid ?? prev.uuid,
      fecha_emision: prefillData.fecha_emision ?? prev.fecha_emision,
      xml_file: prefillData.xml_file ?? prev.xml_file,
    }));
  }, [prefillData, open, suppliers]);

  // Cargar Edición
  useEffect(() => {
    if (!open) return;

    if (editInvoice) {
      setFormData({
        supplier_id: editInvoice.supplier_id
          ? String(editInvoice.supplier_id)
          : "none",
        concepto: editInvoice.concepto ?? "",
        monto_total: editInvoice.monto_total ?? 0,
        fecha_emision: editInvoice.fecha_emision ?? yyyyMmDdToday(),
        dias_credito: editInvoice.dias_credito ?? 0,
        moneda: (editInvoice.moneda as "MXN" | "USD") ?? "MXN",
        uuid: editInvoice.uuid ?? "",
        clasificacion:
          (editInvoice.clasificacion as FinancialClassification) ?? "",
        viaje_id: editInvoice.viaje_id ? String(editInvoice.viaje_id) : "",
        unidad_id: editInvoice.unit_id ? String(editInvoice.unit_id) : "",
        categoria_indirecto_id: editInvoice.categoria_indirecto_id
          ? String(editInvoice.categoria_indirecto_id)
          : "",
        orden_compra_id: editInvoice.orden_compra_id ?? "",
        orden_compra_folio: editInvoice.orden_compra_folio ?? "",
        pdf_url: editInvoice.pdf_url ?? "",
        xml_url: editInvoice.xml_url ?? "",
        pdf_file: null,
        xml_file: null,
      });

      setValidationErrors([]);
      setShowNewCategoryInput(false);
      setNewCategoryName("");
      return;
    }

    if (!prefillData) {
      setFormData({
        supplier_id: "none",
        concepto: "",
        monto_total: 0,
        fecha_emision: yyyyMmDdToday(),
        dias_credito: 0,
        moneda: "MXN",
        uuid: "",
        clasificacion: "",
        viaje_id: "",
        unidad_id: "",
        categoria_indirecto_id: "",
        orden_compra_id: "",
        orden_compra_folio: "",
        pdf_url: "",
        xml_url: "",
        pdf_file: null,
        xml_file: null,
      });

      setValidationErrors([]);
      setShowNewCategoryInput(false);
      setNewCategoryName("");
    }
  }, [editInvoice, open, prefillData]);

  // Validaciones
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (formData.monto_total === undefined || formData.monto_total === null)
      errors.push("Debes ingresar un monto");

    if (!formData.clasificacion)
      errors.push("La clasificación financiera es obligatoria");

    if (
      formData.clasificacion === "costo_directo_viaje" &&
      !toIntOrNull(formData.viaje_id)
    ) {
      errors.push("Debes vincular un viaje para Costo Directo de Viaje");
    }
    if (
      formData.clasificacion === "costo_mantenimiento" &&
      !toIntOrNull(formData.unidad_id)
    ) {
      errors.push("Debes vincular una unidad para Costo de Maintenance");
    }
    if (
      (formData.clasificacion === "gasto_indirecto_fijo" ||
        formData.clasificacion === "gasto_indirecto_variable") &&
      !toIntOrNull(formData.categoria_indirecto_id)
    ) {
      errors.push("Selecciona (o crea) una categoría de gasto indirecto");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const filteredCategories = useMemo(() => {
    const tipo =
      formData.clasificacion === "gasto_indirecto_fijo"
        ? "fijo"
        : formData.clasificacion === "gasto_indirecto_variable"
          ? "variable"
          : null;
    if (!tipo)
      return indirectCategories.filter(
        (c) => (c.estatus ?? "activo") === "activo",
      );
    return indirectCategories.filter(
      (c) => (c.estatus ?? "activo") === "activo" && c.tipo === tipo,
    );
  }, [indirectCategories, formData.clasificacion]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const tipo =
      formData.clasificacion === "gasto_indirecto_fijo" ? "fijo" : "variable";
    if (!onCreateIndirectCategory) {
      toast.error("No hay handler para crear categorías");
      return;
    }
    try {
      setCreatingCategory(true);
      const created = await onCreateIndirectCategory({
        nombre: newCategoryName.trim(),
        tipo,
      });
      if (!created) {
        toast.error("No se pudo crear la categoría");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        categoria_indirecto_id: String(created.id),
      }));
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      toast.success(`Categoría "${created.nombre}" creada`);
    } catch {
      toast.error("Error al crear categoría");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handlePdfChange = async (file: File | null) => {
    if (!file) return;
    if (onUploadPdf) {
      try {
        setUploadingPdf(true);
        const r = await onUploadPdf(file);
        setFormData((prev) => ({ ...prev, pdf_url: r.url, pdf_file: null }));
        toast.success("Comprobante subido");
      } catch {
        toast.error("No se pudo subir el archivo");
      } finally {
        setUploadingPdf(false);
      }
      return;
    }
    setFormData((prev) => ({ ...prev, pdf_file: file }));
  };

  const handleXmlChange = async (file: File | null) => {
    if (!file) return;
    if (onUploadXml) {
      try {
        setUploadingXml(true);
        const r = await onUploadXml(file);
        setFormData((prev) => ({ ...prev, xml_url: r.url, xml_file: null }));
        toast.success("XML subido");
      } catch {
        toast.error("No se pudo subir el XML");
      } finally {
        setUploadingXml(false);
      }
      return;
    }
    setFormData((prev) => ({ ...prev, xml_file: file }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Corrige los errores antes de continuar");
      return;
    }

    const payload: RegisterExpensePayload = {
      supplier_id: toIntOrNull(formData.supplier_id),
      concepto: formData.concepto,
      monto_total: formData.monto_total,
      moneda: formData.moneda,
      uuid: formData.uuid.trim() ? formData.uuid.trim() : null,
      fecha_emision: formData.fecha_emision,
      dias_credito: formData.dias_credito,
      fecha_vencimiento,
      clasificacion: formData.clasificacion,
      viaje_id: toIntOrNull(formData.viaje_id),
      unidad_id: toIntOrNull(formData.unidad_id),
      categoria_indirecto_id: toIntOrNull(formData.categoria_indirecto_id),
      orden_compra_id: formData.orden_compra_id
        ? formData.orden_compra_id
        : null,
      orden_compra_folio: formData.orden_compra_folio
        ? formData.orden_compra_folio
        : null,
      pdf_url: formData.pdf_url ? formData.pdf_url : null,
      xml_url: formData.xml_url ? formData.xml_url : null,
    };

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la factura");
    }
  };

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => (s.estatus ?? "activo") === "activo"),
    [suppliers],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                editInvoice
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30",
              )}
            >
              <FileText
                className={cn(
                  "h-6 w-6",
                  editInvoice
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {editInvoice ? "Editar Gasto" : "Registrar Gasto"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {formData.orden_compra_folio
                  ? `Origen: ${formData.orden_compra_folio}`
                  : "Registro de factura o gasto operativo"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Errores de validación:
                </p>
                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 mt-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-muted/50 custom-scrollbar space-y-4">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Proveedor (Opcional)
            </Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) =>
                setFormData((p) => ({ ...p, supplier_id: value }))
              }
              disabled={isProviderLocked}
            >
              <SelectTrigger
                className={`h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 ${isProviderLocked ? "bg-muted cursor-not-allowed" : ""}`}
              >
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem
                  value="none"
                  className="italic text-muted-foreground font-medium"
                >
                  -- Sin Proveedor (Caja Chica) --
                </SelectItem>
                {activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProviderLocked && (
              <p className="text-xs text-muted-foreground">
                ⚠️ No se puede cambiar el proveedor porque ya tiene pagos
                registrados.
              </p>
            )}
          </div>

          {/* Clasificación financiera */}
          <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Clasificación Financiera{" "}
                <span className="text-status-danger">*</span>
              </Label>
              <Select
                value={formData.clasificacion}
                onValueChange={(value: FinancialClassification) => {
                  setFormData((p) => ({
                    ...p,
                    clasificacion: value,
                    viaje_id: "",
                    unidad_id: "",
                    categoria_indirecto_id: "",
                  }));
                  setValidationErrors([]);
                  setShowNewCategoryInput(false);
                  setNewCategoryName("");
                }}
              >
                <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                  <SelectValue placeholder="Selecciona la clasificación" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="costo_directo_viaje">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Costo Directo de Viaje
                    </div>
                  </SelectItem>
                  <SelectItem value="costo_mantenimiento">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Costo de Maintenance
                    </div>
                  </SelectItem>
                  <SelectItem value="gasto_indirecto_fijo">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Gasto Indirecto Fijo
                    </div>
                  </SelectItem>
                  <SelectItem value="gasto_indirecto_variable">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Gasto Indirecto Variable
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.clasificacion === "costo_directo_viaje" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Viaje Asociado <span className="text-status-danger">*</span>
                </Label>
                <Select
                  value={formData.viaje_id}
                  onValueChange={(value) =>
                    setFormData((p) => ({ ...p, viaje_id: value }))
                  }
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                    <SelectValue placeholder="Selecciona el viaje" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <span className="font-mono text-xs mr-2">
                          {t.uuid_fiscal.slice(0, 8).toUpperCase()}
                        </span>
                        {t.origin} → {t.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.clasificacion === "costo_mantenimiento" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Unidad Económica <span className="text-status-danger">*</span>
                </Label>
                <Select
                  value={formData.unidad_id}
                  onValueChange={(value) =>
                    setFormData((p) => ({ ...p, unidad_id: value }))
                  }
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                    <SelectValue placeholder="Selecciona la unidad" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        <span className="font-mono font-medium mr-2">
                          {u.numero_economico}
                        </span>
                        {u.tipo} - {u.placas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.clasificacion === "gasto_indirecto_fijo" ||
              formData.clasificacion === "gasto_indirecto_variable") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Categoría de Gasto{" "}
                    <span className="text-status-danger">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      // Disparamos un evento personalizado que atraparemos en Payables
                      document.dispatchEvent(
                        new CustomEvent("open-manage-categories"),
                      );
                    }}
                    className=" flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Settings2 className="h-3 w-3" /> Administrar
                  </button>
                </div>
                {!showNewCategoryInput ? (
                  <Select
                    value={formData.categoria_indirecto_id}
                    onValueChange={(value) => {
                      if (value === "__new__") setShowNewCategoryInput(true);
                      else
                        setFormData((p) => ({
                          ...p,
                          categoria_indirecto_id: value,
                        }));
                    }}
                  >
                    <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="__new__"
                        className="text-primary font-medium"
                        disabled={!onCreateIndirectCategory}
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="h-3 w-3" /> Crear nueva categoría...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la nueva categoría"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-11 bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleAddCategory}
                      className="h-10"
                      disabled={creatingCategory}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                      }}
                      className="h-10"
                      disabled={creatingCategory}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Concepto
            </Label>
            <Textarea
              placeholder="Descripción del gasto, peaje o compra..."
              value={formData.concepto}
              onChange={(e) =>
                setFormData((p) => ({ ...p, concepto: e.target.value }))
              }
              className="min-h-[60px] bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Monto / Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <DollarSign className="h-3 w-3 inline mr-1" /> Monto Total{" "}
                <span className="text-status-danger">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                // Fix del Bug de React: Permitir que "0" se muestre
                value={
                  formData.monto_total === 0 ? 0 : formData.monto_total || ""
                }
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    monto_total: normalizeMoney(e.target.value),
                  }))
                }
                className={`h-11 font-mono font-bold bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100 ${isAmountLocked ? "cursor-not-allowed" : ""}`}
                disabled={isAmountLocked}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Moneda
              </Label>
              <Select
                value={formData.moneda}
                onValueChange={(value: "MXN" | "USD") =>
                  setFormData((p) => ({ ...p, moneda: value }))
                }
              >
                <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="MXN">🇲🇽 MXN (Pesos)</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha emisión / días crédito */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Calendar className="h-3 w-3 inline mr-1" /> Fecha Emisión
              </Label>
              <Input
                type="date"
                value={formData.fecha_emision}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, fecha_emision: e.target.value }))
                }
                className="h-11 font-mono font-bold bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Días de Crédito
              </Label>
              <Select
                value={String(formData.dias_credito)}
                onValueChange={(value) =>
                  setFormData((p) => ({
                    ...p,
                    dias_credito: toIntOrZero(value),
                  }))
                }
              >
                <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {creditDaysOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Fecha de Vencimiento (calculada):
              </span>
              <span className="font-semibold text-foreground">
                {fecha_vencimiento}
              </span>
            </div>
          </div>

          {/* UUID */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Folio Fiscal o Recibo (Opcional)
            </Label>
            <Input
              placeholder="Ej: xxxxxxxx-xxxx-xxxx... o REC-123"
              value={formData.uuid}
              onChange={(e) =>
                setFormData((p) => ({ ...p, uuid: e.target.value }))
              }
              className="h-11 font-mono text-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100 tracking-widest uppercase"
            />
          </div>

          {/* Uploads Limpios */}
          <div className="grid grid-cols-2 gap-4">
            {/* Comprobante General */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Upload className="h-3 w-3 inline mr-1" /> Comprobante (PDF /
                Imagen)
              </Label>
              <Input
                type="file"
                accept=".pdf, image/jpeg, image/png, image/webp"
                className="h-9 text-xs"
                disabled={uploadingPdf}
                onChange={(e) => handlePdfChange(e.target.files?.[0] || null)}
              />
              {formData.pdf_url ? (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={formData.pdf_url}
                >
                  📄 {formData.pdf_url.split("/").pop()}
                </p>
              ) : formData.pdf_file ? (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={formData.pdf_file.name}
                >
                  📄 {formData.pdf_file.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>

            {/* XML Opcional */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Upload className="h-3 w-3 inline mr-1" /> XML (Opcional)
              </Label>
              <Input
                type="file"
                accept=".xml"
                className="h-9 text-xs"
                disabled={uploadingXml}
                onChange={(e) => handleXmlChange(e.target.files?.[0] || null)}
              />
              {formData.xml_url ? (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={formData.xml_url}
                >
                  📄 {formData.xml_url.split("/").pop()}
                </p>
              ) : formData.xml_file ? (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={formData.xml_file.name}
                >
                  📄 {formData.xml_file.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {!onUploadPdf || !onUploadXml ? (
            <div className="text-xs text-muted-foreground">
              Los archivos se adjuntarán al envío del formulario.
            </div>
          ) : null}
        </div>
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className={cn(
                "w-full sm:w-auto haptic-press border-none text-white font-black uppercase tracking-widest text-[10px]",
                editInvoice
                  ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)]"
                  : "bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)]",
              )}
              disabled={uploadingPdf || uploadingXml || creatingCategory}
            >
              {editInvoice ? "Guardar Cambios" : "Registrar Gasto"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
