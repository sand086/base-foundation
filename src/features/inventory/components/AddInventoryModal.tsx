import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Check, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import { InventoryItem } from "@/features/inventory/types";
import { cn } from "@/lib/utils";

// Form Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// --- NUEVO: IMPORTAR HOOK DE PROVEEDORES ---
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

interface AddInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSave: (item: any) => Promise<void>;
}

const categories = [
  { value: "motor", label: "Motor" },
  { value: "frenos", label: "Frenos" },
  { value: "eléctrico", label: "Eléctrico" },
  { value: "suspensión", label: "Suspensión" },
  { value: "transmisión", label: "Transmisión" },
  { value: "general", label: "General" },
];

// =====================
// ESQUEMA ZOD ACTUALIZADO
// =====================
const inventorySchema = z.object({
  sku: z.string().min(2, "El SKU es requerido"),
  descripcion: z.string().min(3, "La descripción es requerida"),
  categoria: z.string().min(1, "La categoría es requerida"),
  stock_actual: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  stock_minimo: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  precio_unitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
  ubicacion: z.string().optional(),
  proveedor_id: z.coerce.number().optional().nullable(), // NUEVO
});

type InventoryFormData = z.infer<typeof inventorySchema>;

export function AddInventoryModal({
  open,
  onOpenChange,
  itemToEdit,
  onSave,
}: AddInventoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NUEVO: CARGAR PROVEEDORES ---
  const { suppliers, isLoadingSuppliers } = useSuppliers();

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      sku: "",
      descripcion: "",
      categoria: "general",
      stock_actual: 0,
      stock_minimo: 0,
      precio_unitario: 0,
      ubicacion: "",
      proveedor_id: null,
    },
  });

  const { reset, handleSubmit } = form;
  const isEditMode = !!itemToEdit;

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        reset({
          sku: itemToEdit.sku,
          descripcion: itemToEdit.descripcion,
          categoria: itemToEdit.categoria,
          stock_actual: itemToEdit.stock_actual,
          stock_minimo: itemToEdit.stock_minimo,
          ubicacion: itemToEdit.ubicacion || "",
          precio_unitario: itemToEdit.precio_unitario,
          proveedor_id: (itemToEdit as any).proveedor_id || null, // Mapeo seguro
        });
      } else {
        reset({
          sku: "",
          descripcion: "",
          categoria: "general",
          stock_actual: 0,
          stock_minimo: 0,
          ubicacion: "",
          precio_unitario: 0,
          proveedor_id: null,
        });
      }
    }
  }, [itemToEdit, open, reset]);

  const onFormSubmit = async (data: InventoryFormData) => {
    setIsSubmitting(true);
    try {
      await onSave({
        ...data,
        categoria: data.categoria.toLowerCase(),
      });
      toast.success(
        isEditMode ? "Refacción actualizada" : "Refacción agregada",
        {
          description: `${data.sku} - ${data.descripcion}`,
        },
      );
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la refacción");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) handleClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                isEditMode
                  ? "bg-brand-green/10 dark:bg-brand-green/20"
                  : "bg-brand-red/10 dark:bg-brand-red/20",
              )}
            >
              {isEditMode ? (
                <Edit className="h-7 w-7 sm:h-8 sm:w-8 text-brand-green drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              ) : (
                <Package className="h-7 w-7 sm:h-8 sm:w-8 text-brand-red drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none truncate">
                {isEditMode ? "Editar Refacción" : "Nueva Refacción"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                {isEditMode
                  ? "Modifica los datos del elemento en el almacén."
                  : "Registra una nueva pieza en el inventario global."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          SKU
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isEditMode}
                            placeholder="REF-001"
                            className={cn(
                              "h-11 font-mono font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm",
                              isEditMode &&
                                "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed",
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Categoría
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-black uppercase text-xs glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            {categories.map((cat) => (
                              <SelectItem
                                key={cat.value}
                                value={cat.value}
                                className="font-bold uppercase text-xs"
                              >
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* --- NUEVO: CAMPO PROVEEDOR --- */}
                  <FormField
                    control={form.control}
                    name="proveedor_id"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel variant="brand">
                          Proveedor Habitual
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value ? String(field.value) : undefined}
                          disabled={isLoadingSuppliers}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Seleccione un proveedor (Opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 max-h-60">
                            {suppliers.map((sup) => (
                              <SelectItem
                                key={sup.id}
                                value={String(sup.id)}
                                className="font-bold text-xs uppercase"
                              >
                                {sup.razon_social}
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
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel variant="brand" required>
                          Descripción
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Filtro de aceite para motor Cummins"
                            className="h-11 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_actual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Stock Actual
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_minimo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Stock Mínimo (Alerta)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precio_unitario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Precio Unitario (SIN IVA)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-11 pl-7 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ubicacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Ubicación Física</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Almacén A - Estante 3"
                            className="h-11 font-bold uppercase glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px]",
                    isEditMode
                      ? "bg-brand-green hover:bg-brand-green/80 shadow-emerald-500/20"
                      : "bg-brand-red hover:bg-brand-red/80 shadow-brand-red/20",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {isEditMode ? "Actualizar Refacción" : "Registrar Refacción"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
