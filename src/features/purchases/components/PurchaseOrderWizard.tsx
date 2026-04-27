import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Trash2,
  CalendarIcon,
  Package,
  Wrench,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Check,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// IMPORTACIONES FSD
import {
  PurchaseOrder,
  OrderItem,
  OrderType,
  CostCenter,
} from "@/features/purchases/types";
import { IndirectCategory } from "@/features/payables/types";

import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useInventory } from "@/features/inventory/hooks/useInventory";

interface PurchaseOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: PurchaseOrder) => void;
  editingOrder?: PurchaseOrder | null;
}

const STEPS = [
  { id: 1, title: "Clasificación", description: "Datos generales de la orden" },
  {
    id: 2,
    title: "Conceptos",
    description: "Productos o servicios a solicitar",
  },
  { id: 3, title: "Finanzas", description: "Revisión de montos e impuestos" },
];

export function PurchaseOrderWizard({
  open,
  onOpenChange,
  onSave,
  editingOrder,
}: PurchaseOrderWizardProps) {
  const { suppliers = [] } = useSuppliers();
  const { inventoryItems = [] } = useInventory();
  const { indirectCategories = [] } = useSuppliers(); // Asumiendo que viene de aquí en tu lógica
  const [currentStep, setCurrentStep] = useState(1);

  // ==========================================
  // ESTADOS DEL FORMULARIO
  // ==========================================

  // Step 1: Encabezado
  const [tipo, setTipo] = useState<OrderType>(editingOrder?.tipo || "compra");
  const [supplierId, setSupplierId] = useState<string>(
    editingOrder?.supplier_id || "",
  );
  const [requiredDate, setRequiredDate] = useState<Date | undefined>(
    editingOrder?.required_date
      ? new Date(editingOrder.required_date)
      : undefined,
  );
  const [costCenter, setCostCenter] = useState<CostCenter>(
    editingOrder?.cost_center || "mantenimiento",
  );
  const [indirectCategoryId, setIndirectCategoryId] = useState<string>(
    editingOrder?.indirect_category?.id?.toString() || "",
  );
  const [requester, setRequester] = useState(editingOrder?.requester || "");

  // Step 2: Detalle Operativo
  const [items, setItems] = useState<OrderItem[]>(editingOrder?.items || []);
  const [serviceDescription, setServiceDescription] = useState(
    editingOrder?.service_description || "",
  );

  const [serviceAmount, setServiceAmount] = useState<number>(
    editingOrder?.subtotal || 0,
  );

  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);

  // Step 3: Finanzas
  const [moneda, setMoneda] = useState<"MXN" | "USD">(
    editingOrder?.moneda || "MXN",
  );

  // ==========================================
  // LÓGICA DE NEGOCIO Y CÁLCULOS
  // ==========================================

  const filteredSuppliers = (suppliers || []).filter((s: any) => {
    if (tipo === "compra")
      return (
        s.tipo_proveedor === "refacciones" || s.tipo_proveedor === "general"
      );
    if (tipo === "servicio")
      return s.tipo_proveedor === "servicios" || s.tipo_proveedor === "general";
    return true;
  });

  const subtotal = useMemo(() => {
    if (tipo === "servicio" || tipo === "gasto_indirecto") {
      return items.length > 0
        ? items.reduce((sum, item) => sum + item.subtotal, 0)
        : serviceAmount;
    }
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items, tipo, serviceAmount]);

  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // ==========================================
  // MANEJADORES DE EVENTOS
  // ==========================================

  const handleAddItem = () => {
    const inventoryItem = inventoryItems.find(
      (i) => i.id.toString() === selectedInventoryItem,
    );
    if (!inventoryItem || itemCantidad <= 0) {
      toast.error("Selecciona un ítem y cantidad válida");
      return;
    }

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      descripcion: inventoryItem.descripcion,
      cantidad: itemCantidad,
      unidad: inventoryItem.unidad || "PZ",
      precioUnitario: inventoryItem.precio_unitario || 0,
      subtotal: (inventoryItem.precio_unitario || 0) * itemCantidad,
    };

    setItems([...items, newItem]);
    setSelectedInventoryItem("");
    setItemCantidad(1);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setTipo("compra");
    setSupplierId("");
    setRequiredDate(undefined);
    setCostCenter("mantenimiento");
    setIndirectCategoryId("");
    setRequester("");
    setItems([]);
    setServiceDescription("");
    setServiceAmount(0);
    setMoneda("MXN");
  };

  const handleSubmit = () => {
    const proveedor = suppliers.find((s) => s.id.toString() === supplierId);
    const categoriaSeleccionada = indirectCategories.find(
      (c: any) => c.id.toString() === indirectCategoryId,
    );

    const payload: PurchaseOrder = {
      ...editingOrder,
      id: editingOrder?.id || `po-${Date.now()}`,
      folio: editingOrder?.folio || "PENDIENTE",
      tipo,
      supplier_id: supplierId,
      supplier_name: (proveedor as any)?.razon_social || "Proveedor",
      requester,
      required_date: requiredDate?.toISOString() as string,
      cost_center: costCenter,
      indirect_category:
        tipo === "gasto_indirecto" ? categoriaSeleccionada : undefined,
      items,
      service_description:
        tipo === "servicio" || tipo === "gasto_indirecto"
          ? serviceDescription
          : undefined,
      subtotal,
      iva,
      total,
      moneda,
      status: editingOrder?.status || "borrador",
    };

    onSave(payload);
    handleReset();
    onOpenChange(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!supplierId && !!requiredDate && !!requester;
      case 2:
        if (tipo === "compra") return items.length > 0;
        if (tipo === "servicio" || tipo === "gasto_indirecto") {
          return serviceDescription.length > 5 && serviceAmount > 0;
        }
        return false;
      case 3:
        return subtotal > 0;
      default:
        return false;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda,
    }).format(amount);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleReset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-slate-950 border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white">
            {editingOrder
              ? "Editar Orden de Compra"
              : "Nueva Orden de Compra / Servicio"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Sigue los pasos para generar el documento oficial de autorización.
          </DialogDescription>
        </DialogHeader>

        {/* PROGRESS STEPS */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3 flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-300 shadow-sm",
                  currentStep > step.id
                    ? "bg-emerald-500 text-white shadow-emerald-500/30"
                    : currentStep === step.id
                      ? "bg-brand-navy text-white shadow-blue-500/30 ring-4 ring-brand-navy/10"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400",
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5 text-slate-500 dark:text-white/70" />
                ) : (
                  step.id
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    currentStep >= step.id
                      ? "text-brand-navy dark:text-white"
                      : "text-slate-400",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  {step.description}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-4 rounded-full transition-all duration-500",
                    currentStep > step.id
                      ? "bg-emerald-500"
                      : "bg-slate-100 dark:bg-slate-800",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Naturaleza de la Orden *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTipo("compra");
                      setItems([]);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-start gap-2 group shadow-sm",
                      tipo === "compra"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10"
                        : "border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-950",
                    )}
                  >
                    <Package
                      className={cn(
                        "h-6 w-6 transition-colors",
                        tipo === "compra"
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-blue-500",
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-black uppercase text-xs tracking-wide",
                          tipo === "compra"
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Catálogo
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Bienes o Refacciones
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipo("servicio");
                      setItems([]);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-start gap-2 group shadow-sm",
                      tipo === "servicio"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-4 ring-purple-500/10"
                        : "border-slate-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-slate-950",
                    )}
                  >
                    <Wrench
                      className={cn(
                        "h-6 w-6 transition-colors",
                        tipo === "servicio"
                          ? "text-purple-600"
                          : "text-slate-400 group-hover:text-purple-500",
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-black uppercase text-xs tracking-wide",
                          tipo === "servicio"
                            ? "text-purple-900 dark:text-purple-100"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Servicio
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Talleres externos
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipo("gasto_indirecto");
                      setItems([]);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left flex flex-col items-start gap-2 group shadow-sm",
                      tipo === "gasto_indirecto"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-4 ring-amber-500/10"
                        : "border-slate-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-slate-950",
                    )}
                  >
                    <Receipt
                      className={cn(
                        "h-6 w-6 transition-colors",
                        tipo === "gasto_indirecto"
                          ? "text-amber-600"
                          : "text-slate-400 group-hover:text-amber-500",
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-black uppercase text-xs tracking-wide",
                          tipo === "gasto_indirecto"
                            ? "text-amber-900 dark:text-amber-100"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Indirecto
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Gastos Administrativos
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Proveedor Asignado *
                  </Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-11 font-bold text-xs uppercase bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Seleccionar proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSuppliers.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={String(s.id)}
                          className="font-bold text-xs uppercase"
                        >
                          {(s as any).razon_social || (s as any).nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Fecha Requerida *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-bold text-xs uppercase h-11 bg-white dark:bg-slate-950 shadow-sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                        {requiredDate
                          ? format(requiredDate, "dd / MMM / yyyy", {
                              locale: es,
                            })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={requiredDate}
                        onSelect={setRequiredDate}
                        locale={es}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Centro de Costos *
                  </Label>
                  <Select
                    value={costCenter}
                    onValueChange={(v) => setCostCenter(v as CostCenter)}
                  >
                    <SelectTrigger className="h-11 font-bold text-xs uppercase bg-white dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="mantenimiento"
                        className="font-bold text-xs uppercase"
                      >
                        Maintenance
                      </SelectItem>
                      <SelectItem
                        value="operaciones"
                        className="font-bold text-xs uppercase"
                      >
                        Operaciones
                      </SelectItem>
                      <SelectItem
                        value="administracion"
                        className="font-bold text-xs uppercase"
                      >
                        Administrativo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipo === "gasto_indirecto" && (
                  <div className="space-y-2 animate-in fade-in">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Categoría del Gasto
                    </Label>
                    <Select
                      value={indirectCategoryId}
                      onValueChange={setIndirectCategoryId}
                    >
                      <SelectTrigger className="h-11 font-bold text-xs uppercase bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="papeleria"
                          className="font-bold text-xs uppercase"
                        >
                          Papelería
                        </SelectItem>
                        <SelectItem
                          value="renta"
                          className="font-bold text-xs uppercase"
                        >
                          Renta
                        </SelectItem>
                        <SelectItem
                          value="limpieza"
                          className="font-bold text-xs uppercase"
                        >
                          Limpieza
                        </SelectItem>
                        <SelectItem
                          value="servicios"
                          className="font-bold text-xs uppercase"
                        >
                          Servicios Fijos
                        </SelectItem>
                        <SelectItem
                          value="nomina"
                          className="font-bold text-xs uppercase"
                        >
                          Nómina
                        </SelectItem>
                        <SelectItem
                          value="otros"
                          className="font-bold text-xs uppercase"
                        >
                          Otros
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Persona Solicitante *
                  </Label>
                  <Input
                    placeholder="Nombre completo..."
                    value={requester}
                    onChange={(e) => setRequester(e.target.value)}
                    className="h-11 font-bold text-xs uppercase bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {tipo === "compra" && (
                <div className="space-y-6">
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" /> Añadir
                      Refacción del Catálogo
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Select
                        value={selectedInventoryItem}
                        onValueChange={setSelectedInventoryItem}
                      >
                        <SelectTrigger className="flex-1 h-11 font-bold text-xs uppercase bg-slate-50 dark:bg-slate-950">
                          <SelectValue placeholder="Busca por código o nombre..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                              className="py-3 border-b last:border-0 border-slate-100 dark:border-white/5"
                            >
                              <div className="flex flex-col">
                                <span className="font-black text-xs uppercase">
                                  {item.sku} - {item.descripcion}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Stock en almacén: {item.stock_actual}{" "}
                                  {item.unidad}{" "}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Cant."
                          className="w-24 h-11 font-mono font-bold text-center bg-slate-50 dark:bg-slate-950"
                          value={itemCantidad}
                          onChange={(e) =>
                            setItemCantidad(parseInt(e.target.value) || 0)
                          }
                          min={1}
                        />
                        <Button
                          onClick={handleAddItem}
                          className="h-11 px-4 bg-brand-navy hover:bg-slate-800 text-white font-black uppercase text-xs"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm group"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-xs">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-xs uppercase tracking-wide text-brand-navy dark:text-blue-100">
                              {item.descripcion}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              {item.cantidad} {item.unidad}{" "}
                              <span className="mx-1 text-slate-300">•</span>{" "}
                              c/u: ${item.precioUnitario.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right px-4 border-r border-slate-100 dark:border-white/10">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                              Subtotal
                            </p>
                            <p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              ${item.subtotal.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-5 w-5 text-slate-500 dark:text-white/70" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-slate-900/50">
                      <Package className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="font-black uppercase tracking-widest text-xs text-slate-400">
                        Sin ítems agregados
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(tipo === "servicio" || tipo === "gasto_indirecto") && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Concepto a Pagar *
                    </Label>
                    <Textarea
                      placeholder="Describe detalladamente el trabajo, servicio o gasto. Ej: Reparación de transmisión completa para unidad T-03..."
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      rows={5}
                      className="resize-none bg-white dark:bg-slate-900 font-medium text-sm rounded-xl p-4 shadow-sm"
                    />
                  </div>

                  <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-inner">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />{" "}
                        Monto del Servicio (Subtotal) *
                      </Label>
                      <p className="text-[10px] font-medium text-slate-400">
                        Importe acordado sin IVA.
                      </p>
                    </div>
                    <div className="relative w-48">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={serviceAmount || ""}
                        onChange={(e) =>
                          setServiceAmount(Number(e.target.value))
                        }
                        className="pl-8 h-12 font-mono font-black text-xl text-brand-navy dark:text-white bg-white dark:bg-slate-950 border-2"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/5 max-w-lg mx-auto shadow-xl ring-4 ring-slate-50 dark:ring-slate-950 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Receipt className="h-40 w-40 rotate-12" />
                </div>

                <h3 className="font-black text-center mb-8 flex items-center justify-center gap-3 uppercase tracking-widest text-brand-navy dark:text-blue-100">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                    <DollarSign className="h-5 w-5 text-slate-500 dark:text-white/70" />
                  </div>
                  Resumen Financiero
                </h3>

                <div className="space-y-4 text-sm relative z-10">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Subtotal Acumulado
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Impuestos (IVA 16%)
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(iva)}
                    </span>
                  </div>

                  <div className="pt-4 mt-2">
                    <div className="bg-brand-navy dark:bg-blue-950 rounded-2xl p-5 flex justify-between items-center text-white shadow-lg">
                      <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                        Total a Autorizar
                      </span>
                      <span className="font-mono font-black text-3xl tracking-tighter text-emerald-400">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-white/10 space-y-3 relative z-10">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center block">
                    Confirmar Moneda
                  </Label>
                  <Select
                    value={moneda}
                    onValueChange={(v) => setMoneda(v as "MXN" | "USD")}
                  >
                    <SelectTrigger className="h-12 font-black text-xs uppercase bg-slate-50 dark:bg-slate-950 border-2 justify-center gap-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="MXN"
                        className="font-black text-xs uppercase text-center justify-center"
                      >
                        🇲🇽 Peso Mexicano (MXN)
                      </SelectItem>
                      <SelectItem
                        value="USD"
                        className="font-black text-xs uppercase text-center justify-center"
                      >
                        🇺🇸 Dólar (USD)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NAVIGATION */}
        <DialogFooter className="flex flex-row items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 shrink-0 gap-3">
          <Button
            variant="outline"
            className="font-black uppercase tracking-widest text-[10px] h-11 border-slate-200 dark:border-white/10"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Regresar
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-brand-navy hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg"
            >
              Siguiente Paso <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-emerald-500/20"
            >
              <Check className="h-4 w-4 mr-2" />
              {editingOrder ? "Actualizar Orden" : "Generar Autorización"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
