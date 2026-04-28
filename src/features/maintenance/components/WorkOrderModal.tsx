import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Wrench,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  Loader2,
  Check,
  Home,
  MapPin,
  Save,
  Receipt,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

// Hooks de tu aplicación
import { useMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { useUnits } from "@/features/units/hooks/useUnits";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { InventoryItem } from "@/features/inventory/types";
import { WorkOrder } from "@/features/maintenance/types";

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN ZOD
// ==========================================
const partSchema = z.object({
  inventory_item_id: z.number(),
  cantidad: z.number().min(1, "Mínimo 1"),
});

const workOrderSchema = z
  .object({
    unit_id: z.coerce
      .number({ invalid_type_error: "Selecciona una unidad" })
      .min(1, "Requerido"),
    mechanic_id: z.coerce.number().optional().nullable(),
    tipo_mantenimiento: z.enum(["patio", "ruta"]).default("patio"),
    trip_id: z.coerce.number().optional().nullable(),
    descripcion_problema: z
      .string()
      .min(5, "Describe el problema (mínimo 5 caracteres)"),
    parts: z.array(partSchema).default([]),
    // NUEVOS CAMPOS FINANCIEROS
    costo_mano_obra: z.coerce.number().min(0).default(0),
    porcentaje_iva: z.coerce.number().min(0).max(100).default(16),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_mantenimiento === "ruta" && !data.trip_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona el viaje afectado para el auxilio en ruta",
        path: ["trip_id"],
      });
    }
  });

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface SelectedPart {
  item: InventoryItem;
  cantidad: number;
}

interface WorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderToEdit?: WorkOrder | null;
  onCreate: (order: any) => Promise<boolean>;
}

export const WorkOrderModal = ({
  open,
  onOpenChange,
  orderToEdit,
  onCreate,
}: WorkOrderModalProps) => {
  const { inventory, mechanics } = useMaintenance();
  const { unidades } = useUnits();
  const { trips } = useTrips();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [addingPart, setAddingPart] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);

  const isEditMode = !!orderToEdit;

  // 2. CONFIGURACIÓN DE REACT HOOK FORM
  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      unit_id: undefined,
      mechanic_id: undefined,
      tipo_mantenimiento: "patio",
      trip_id: undefined,
      descripcion_problema: "",
      parts: [],
      costo_mano_obra: 0,
      porcentaje_iva: 16,
    },
  });

  const watchTipoMantenimiento = form.watch("tipo_mantenimiento");
  const watchUnitId = form.watch("unit_id");
  const watchManoObra = form.watch("costo_mano_obra");
  const watchIvaRate = form.watch("porcentaje_iva");

  // 3. SINCRONIZACIÓN DE DATOS (Precarga en edición)
  useEffect(() => {
    if (open) {
      if (orderToEdit) {
        form.reset({
          unit_id: orderToEdit.unit_id,
          mechanic_id: orderToEdit.mechanic_id,
          tipo_mantenimiento:
            (orderToEdit as any).tipo_mantenimiento || "patio",
          trip_id: (orderToEdit as any).trip_id,
          descripcion_problema: orderToEdit.descripcion_problema || "",
          parts: [],
          costo_mano_obra: (orderToEdit as any).costo_mano_obra || 0,
          porcentaje_iva: (orderToEdit as any).porcentaje_iva ?? 16,
        });

        // Precargar partes visuales
        if (orderToEdit.parts && Array.isArray(orderToEdit.parts)) {
          const preLoadedParts: SelectedPart[] = orderToEdit.parts
            .map((p: any) => {
              const invItem = inventory.find(
                (i) => i.id === p.inventory_item_id,
              );
              return invItem ? { item: invItem, cantidad: p.cantidad } : null;
            })
            .filter(Boolean) as SelectedPart[];
          setSelectedParts(preLoadedParts);
        }
      } else {
        form.reset({
          unit_id: undefined,
          mechanic_id: undefined,
          tipo_mantenimiento: "patio",
          trip_id: undefined,
          descripcion_problema: "",
          parts: [],
          costo_mano_obra: 0,
          porcentaje_iva: 16,
        });
        setSelectedParts([]);
      }
      setAddingPart(false);
      setSelectedSkuId("");
      setPartQuantity(1);
    }
  }, [open, orderToEdit, inventory, form]);

  // Actualizar el array de Zod cuando cambia el estado visual de las refacciones
  useEffect(() => {
    form.setValue(
      "parts",
      selectedParts.map((p) => ({
        inventory_item_id: p.item.id,
        cantidad: p.cantidad,
      })),
    );
  }, [selectedParts, form]);

  // Limpiar el viaje si cambia la unidad
  useEffect(() => {
    if (!isEditMode) {
      form.setValue("trip_id", undefined);
    }
  }, [watchUnitId, isEditMode, form]);

  // Filtros Derivados
  const activeTripsForUnit = useMemo(() => {
    if (!watchUnitId || !trips) return [];
    return trips.filter(
      (t: any) =>
        t.status !== "cerrado" &&
        t.status !== "liquidado" &&
        t.legs?.some((l: any) => String(l.unit_id) === String(watchUnitId)),
    );
  }, [trips, watchUnitId]);

  const availableParts = useMemo(() => {
    const usedIds = selectedParts.map((p) => p.item.id);
    return inventory.filter((item) => !usedIds.includes(item.id));
  }, [selectedParts, inventory]);

  const totalDeduction = useMemo(() => {
    return selectedParts.reduce((sum, p) => sum + p.cantidad, 0);
  }, [selectedParts]);

  // NUEVO: Motor de cálculo financiero en tiempo real (Con o sin refacciones)
  const resumenFinanciero = useMemo(() => {
    const costoRefacciones = selectedParts.reduce((acc, part) => {
      const precio = part.item.precio_unitario || 0;
      return acc + part.cantidad * precio;
    }, 0);

    const manoObra = Number(watchManoObra) || 0;
    const subtotal = costoRefacciones + manoObra;
    const ivaRate = Number(watchIvaRate) || 0;
    const iva = subtotal * (ivaRate / 100);
    const total = subtotal + iva;

    return { costoRefacciones, manoObra, subtotal, iva, total };
  }, [selectedParts, watchManoObra, watchIvaRate]);

  // Manejadores de Refacciones
  const handleAddPart = () => {
    const item = inventory.find((i) => i.id.toString() === selectedSkuId);
    if (item && partQuantity > 0) {
      setSelectedParts([...selectedParts, { item, cantidad: partQuantity }]);
      setSelectedSkuId("");
      setPartQuantity(1);
      setAddingPart(false);
    }
  };

  const handleRemovePart = (itemId: number) => {
    setSelectedParts(selectedParts.filter((p) => p.item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setSelectedParts(
      selectedParts.map((p) =>
        p.item.id === itemId ? { ...p, cantidad: newQuantity } : p,
      ),
    );
  };

  // Submit General
  const handleFormSubmit = async (data: WorkOrderFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        trip_id: data.tipo_mantenimiento === "ruta" ? data.trip_id : null,
      };
      const success = await onCreate(payload);
      if (success) {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error("Error al procesar la orden");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20"
                  : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20",
              )}
            >
              <Wrench
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8 drop-shadow-md",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                    : "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {isEditMode
                  ? "Editar Orden de Trabajo"
                  : "Abrir Orden de Trabajo"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {isEditMode
                  ? `Modificando Folio: ${orderToEdit.folio}`
                  : "Generar ticket y descontar inventario"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* FORMULARIO ENVOLTURA */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex-1 overflow-y-auto flex flex-col custom-scrollbar"
          >
            <div className="flex-1 p-6 sm:p-8 bg-muted/50 dark:bg-transparent space-y-8">
              {/* SECCIÓN 1: DATOS GENERALES */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
                  <Wrench className="h-3 w-3 text-blue-500 dark:text-blue-400" />{" "}
                  Datos Generales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Unidad Afectada
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar unidad..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            {unidades.map((unit) => (
                              <SelectItem
                                key={unit.id}
                                value={String(unit.id)}
                                className="font-bold text-xs uppercase"
                              >
                                ECO-{unit.numero_economico}{" "}
                                <span className="text-slate-400 ml-2 font-medium">
                                  ({unit.marca})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mechanic_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Mecánico Asignado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar mecánico..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            {mechanics.map((mech) => (
                              <SelectItem
                                key={mech.id}
                                value={String(mech.id)}
                                className="font-bold text-xs uppercase"
                              >
                                {mech.nombre}{" "}
                                <span className="text-slate-400 ml-2 font-medium">
                                  ({mech.especialidad})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Tipo de Gasto (Afectación Financiera) *
                  </Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.setValue("tipo_mantenimiento", "patio");
                        form.setValue("trip_id", null);
                      }}
                      className={cn(
                        "flex-1 h-12 gap-2 border-2",
                        watchTipoMantenimiento === "patio"
                          ? "border-brand-navy bg-blue-50 text-brand-navy dark:bg-blue-900/30 dark:text-blue-400"
                          : "border-slate-200 dark:border-slate-700",
                      )}
                    >
                      <Home className="h-4 w-4" /> Mantenimiento en Patio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        form.setValue("tipo_mantenimiento", "ruta")
                      }
                      className={cn(
                        "flex-1 h-12 gap-2 border-2",
                        watchTipoMantenimiento === "ruta"
                          ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "border-slate-200 dark:border-slate-700",
                      )}
                    >
                      <MapPin className="h-4 w-4" /> Auxilio en Ruta (Viaje)
                    </Button>
                  </div>

                  {watchTipoMantenimiento === "ruta" && (
                    <FormField
                      control={form.control}
                      name="trip_id"
                      render={({ field }) => (
                        <FormItem className="mt-4 animate-in fade-in slide-in-from-top-2">
                          <FormLabel
                            variant="brand"
                            className="text-amber-700 dark:text-amber-500"
                          >
                            Vincular al Viaje *
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={
                              field.value ? String(field.value) : undefined
                            }
                            disabled={!watchUnitId}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 border-amber-200 dark:border-amber-800/50 bg-white dark:bg-slate-900">
                                <SelectValue
                                  placeholder={
                                    watchUnitId
                                      ? "Selecciona el viaje afectado..."
                                      : "Primero selecciona la Unidad arriba"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                              {activeTripsForUnit.length === 0 ? (
                                <div className="p-2 text-[10px] text-slate-500 text-center font-bold">
                                  No hay viajes activos para esta unidad
                                </div>
                              ) : (
                                activeTripsForUnit.map((t: any) => (
                                  <SelectItem
                                    key={t.id}
                                    value={String(t.id)}
                                    className="font-bold text-xs uppercase"
                                  >
                                    VIAJE {t.public_id || t.id} - {t.origin} a{" "}
                                    {t.destination}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="descripcion_problema"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand" required>
                        Descripción del Problema
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describa el problema o trabajo a realizar..."
                          rows={3}
                          className="min-h-[80px] resize-none bg-card border-slate-200 dark:border-white/10 shadow-sm font-medium text-sm text-slate-800 dark:text-slate-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SECCIÓN 2: REFACCIONES Y ALMACÉN */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Package className="h-3 w-3 text-blue-500" /> Refacciones
                    Requeridas
                  </h3>
                  {!addingPart && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingPart(true)}
                      className="h-8 text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar
                    </Button>
                  )}
                </div>

                {addingPart && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-inner space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          SKU / Refacción
                        </Label>
                        <Select
                          value={selectedSkuId}
                          onValueChange={setSelectedSkuId}
                        >
                          <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-xs font-bold">
                            <SelectValue placeholder="Seleccionar del inventario..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            {availableParts.length === 0 ? (
                              <div className="p-2 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                                No hay refacciones disponibles
                              </div>
                            ) : (
                              availableParts.map((item) => (
                                <SelectItem
                                  key={item.id}
                                  value={item.id.toString()}
                                  className="text-xs"
                                >
                                  <div className="flex items-center justify-between w-full pr-2 gap-4">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="font-mono font-black uppercase text-brand-navy dark:text-blue-400">
                                        {item.sku}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-400 font-medium truncate hidden sm:inline-block max-w-[150px]">
                                        {item.descripcion}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {item.stock_actual <
                                        item.stock_minimo && (
                                        <AlertTriangle className="h-3 w-3 text-rose-500" />
                                      )}
                                      <span
                                        className={cn(
                                          "text-[10px] font-mono font-bold",
                                          item.stock_actual === 0
                                            ? "text-rose-500"
                                            : "text-slate-500",
                                        )}
                                      >
                                        STOCK: {item.stock_actual}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Cantidad
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={partQuantity}
                          onChange={(e) =>
                            setPartQuantity(parseInt(e.target.value) || 1)
                          }
                          className="h-10 font-mono font-bold text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingPart(false)}
                        className="text-[10px] font-black uppercase tracking-widest"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPart}
                        disabled={!selectedSkuId}
                        className="bg-brand-navy hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest shadow-sm"
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {selectedParts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedParts.map((part) => {
                      const isLowStock = part.item.stock_actual < part.cantidad;
                      return (
                        <div
                          key={part.item.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border shadow-sm transition-colors",
                            isLowStock
                              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                              : "bg-card border-border",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="font-mono font-bold text-[10px] bg-slate-50 dark:bg-slate-800 shadow-sm border-slate-200 dark:border-white/10"
                              >
                                {part.item.sku}
                              </Badge>
                              {isLowStock && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] font-black uppercase tracking-widest bg-rose-500"
                                >
                                  Stock Insuficiente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {part.item.descripcion}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                              Disponible en almacén:{" "}
                              <span className="font-mono">
                                {part.item.stock_actual}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">
                                CANT:
                              </span>
                              <Input
                                type="number"
                                min={1}
                                value={part.cantidad}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    part.item.id,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className="w-16 h-8 text-center font-mono font-bold border-none shadow-none bg-white dark:bg-slate-900"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePart(part.item.id)}
                              className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-white/20 rounded-xl">
                    <div className="mx-auto w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      No se han agregado refacciones
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">
                      Puede crear la orden ingresando un Costo Base (Sección 3).
                    </p>
                  </div>
                )}

                {selectedParts.length > 0 && !isEditMode && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex items-start gap-3 animate-in fade-in">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-1">
                        Afectación de Inventario
                      </p>
                      <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/80 leading-snug">
                        Al confirmar esta orden, se descontarán{" "}
                        <span className="font-black">
                          {totalDeduction} refacciones
                        </span>{" "}
                        del catálogo.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: COSTOS Y FINANZAS (NUEVO) */}
              <div className="p-5 border border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 shadow-sm space-y-5">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
                  <Calculator className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />{" "}
                  Resumen de Costos y Finanzas
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="costo_mano_obra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Costo Base / Servicio (Mano de Obra)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                              $
                            </span>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              className="pl-7 font-mono font-bold text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="porcentaje_iva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Porcentaje de IVA Aplicable
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              className="pr-8 font-mono font-bold text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* TARJETA DE TOTALES EN VIVO */}
                <div className="mt-4 p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>Costo Refacciones (Inventario)</span>
                      <span className="font-mono">
                        {formatCurrency(
                          resumenFinanciero.costoRefacciones,
                          "MXN",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>Costo Base (Servicio/Mano Obra)</span>
                      <span className="font-mono">
                        {formatCurrency(resumenFinanciero.manoObra, "MXN")}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                      <span>Subtotal</span>
                      <span className="font-mono">
                        {formatCurrency(resumenFinanciero.subtotal, "MXN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium text-rose-600 dark:text-rose-400/80">
                      <span>IVA ({watchIvaRate || 0}%)</span>
                      <span className="font-mono">
                        +{formatCurrency(resumenFinanciero.iva, "MXN")}
                      </span>
                    </div>
                    <div className="pt-3 mt-1 border-t-2 border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-brand-navy dark:text-emerald-400">
                        Costo Total a Descontar
                      </span>
                      <span className="text-xl font-black font-mono text-brand-navy dark:text-emerald-400">
                        {formatCurrency(resumenFinanciero.total, "MXN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px] haptic-press",
                    isEditMode
                      ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-lg shadow-brand-green/20"
                      : "bg-brand-red hover:bg-brand-red/90 shadow-lg shadow-brand-red/20",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isEditMode ? (
                    <Save className="h-4 w-4 mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {isEditMode ? "Guardar Cambios" : "Crear Orden de Trabajo"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
