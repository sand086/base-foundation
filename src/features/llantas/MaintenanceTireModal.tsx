// src/features/flota/MaintenanceTireModal.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tire } from "@/types/api.types";
import {
  Wrench,
  RefreshCw,
  Trash2,
  DollarSign,
  Check,
  Loader2,
  AlertTriangle,
  Truck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type MaintenanceType = "reparacion" | "renovado" | "desecho";

interface MaintenanceTireModalProps {
  tire: Tire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    tireId: string,
    tipo: MaintenanceType,
    costo: number,
    descripcion: string,
  ) => void;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const maintenanceSchema = z.object({
  tipo: z.enum(["reparacion", "renovado", "desecho"], {
    required_error: "Seleccione un tipo de mantenimiento",
  }),
  costo: z.string().optional(),
  descripcion: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export function MaintenanceTireModal({
  tire,
  open,
  onOpenChange,
  onSubmit,
}: MaintenanceTireModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 REACT HOOK FORM
  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      tipo: undefined,
      costo: "",
      descripcion: "",
    },
  });

  const { watch, reset, handleSubmit } = form;
  const currentTipo = watch("tipo");

  // Limpiar formulario al abrir
  useEffect(() => {
    if (open) {
      reset({ tipo: undefined, costo: "", descripcion: "" });
      setIsSubmitting(false);
    }
  }, [open, reset]);

  if (!tire) return null;

  // =====================
  // SUBMIT
  // =====================
  const onFormSubmit = async (data: MaintenanceFormData) => {
    setIsSubmitting(true);
    try {
      const costoNum = parseFloat(data.costo || "0") || 0;
      await onSubmit(
        tire.id.toString(),
        data.tipo,
        costoNum,
        data.descripcion || "",
      );
      // No cerramos aquí explícitamente, esperamos que el padre cierre si todo salió bien
    } catch (error) {
      toast.error("Ocurrió un error al registrar el mantenimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) onOpenChange(false);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/* 🚀 HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                currentTipo === "desecho"
                  ? "bg-rose-500/20"
                  : "bg-amber-500/20",
              )}
            >
              {currentTipo === "desecho" ? (
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              ) : (
                <Wrench className="h-7 w-7 sm:h-8 sm:w-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                Mantenimiento
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1 truncate">
                {tire.codigo_interno} • {tire.marca} {tire.modelo}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 🚀 BODY: FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="space-y-6">
                {/* Resumen Estado Actual */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Estado Actual
                    </p>
                    <p className="text-sm font-black text-brand-navy dark:text-white uppercase tracking-tight mt-1">
                      {tire.estado}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Ubicación
                    </p>
                    <p className="text-sm font-black text-brand-navy dark:text-white uppercase tracking-tight mt-1 flex items-center gap-1.5">
                      {tire.unidad_actual_economico ? (
                        <>
                          <Truck className="h-4 w-4 text-slate-400" /> ECO-
                          {tire.unidad_actual_economico}
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 text-amber-500" /> En
                          Almacén
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Tipo Mantenimiento */}
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Tipo de Acción
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 glass-card font-black uppercase text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar acción..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            <SelectItem
                              value="reparacion"
                              className="font-bold text-xs uppercase text-amber-600 dark:text-amber-500"
                            >
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" /> Reparación
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="renovado"
                              className="font-bold text-xs uppercase text-purple-600 dark:text-purple-400"
                            >
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" /> Enviar a
                                Renovado
                              </div>
                            </SelectItem>
                            <div className="h-px bg-slate-200 dark:bg-white/10 my-1 mx-2" />
                            <SelectItem
                              value="desecho"
                              className="font-bold text-xs uppercase text-rose-600 dark:text-rose-500"
                            >
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" /> Enviar a Desecho
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Costo */}
                  <FormField
                    control={form.control}
                    name="costo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          variant="brand"
                          className="flex items-center gap-2"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />{" "}
                          Costo Estimado (MXN)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Descripción */}
                  <FormField
                    control={form.control}
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Observaciones</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalles del daño, proveedor, número de factura..."
                            {...field}
                            className="min-h-[80px] resize-none glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm font-medium text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {currentTipo === "desecho" && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-xl shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400 mb-1">
                        Acción Irreversible
                      </p>
                      <p className="text-xs font-medium text-rose-900/80 dark:text-rose-200/80 leading-snug">
                        Al confirmar el desecho, la llanta se marcará como
                        inactiva permanentemente en el inventario.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 🚀 FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto haptic-press flex-shrink-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={
                    currentTipo === "desecho" ? "destructive" : "default"
                  }
                  size="lg"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none",
                    currentTipo !== "desecho" &&
                      "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 text-white",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {currentTipo === "desecho" ? "Confirmar Baja" : "Registrar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
