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
import { toast } from "sonner";
import { Tire } from "@/features/tires/types";
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

  //  REACT HOOK FORM
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
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/*  CAPA 2: CABECERA TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                currentTipo === "desecho"
                  ? "bg-rose-100 dark:bg-rose-900/30"
                  : "bg-amber-100 dark:bg-amber-900/30",
              )}
            >
              {currentTipo === "desecho" ? (
                <Trash2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              ) : (
                <Wrench className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Maintenance
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate tracking-normal normal-case">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                  {tire.codigo_interno}
                </span>{" "}
                • {tire.marca} {tire.modelo}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/*  CAPA 3: CUERPO (Fondo slate-50 para resaltar inputs) */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-muted/50 custom-scrollbar">
              <div className="space-y-6">
                {/*  Resumen Estado Actual */}
                <div className="p-5 bg-card rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                      Estado Actual
                    </p>
                    <p className="text-sm font-black text-brand-navy dark:text-white uppercase tracking-tight mt-1">
                      {tire.estado}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                      Ubicación
                    </p>
                    <p className="text-sm font-black text-brand-navy dark:text-white uppercase tracking-tight mt-1 flex items-center gap-1.5">
                      {tire.unidad_actual_economico ? (
                        <>
                          <Truck className="h-4 w-4 text-blue-500" /> ECO-
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
                  {/*  Tipo Maintenance */}
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
                            <SelectTrigger className="h-11 font-black uppercase text-xs shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar acción..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border">
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

                  {/* 💰 Costo */}
                  <FormField
                    control={form.control}
                    name="costo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          variant="brand"
                          className="flex items-center gap-2"
                        >
                          Costo Estimado (MXN)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 dark:text-emerald-400 font-black">
                              <DollarSign className="h-4 w-4" />
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              className="h-11 pl-9 font-mono font-bold uppercase bg-card border-border shadow-sm"
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 📝 Descripción */}
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
                            className="min-h-[80px] resize-none bg-card border-border shadow-sm font-medium text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/*  Advertencia de Desecho */}
                {currentTipo === "desecho" && (
                  <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-xl shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400 mb-1">
                        Acción Irreversible
                      </p>
                      <p className="text-xs font-medium text-rose-900/80 dark:text-rose-200/80 leading-snug">
                        Al confirmar el desecho, la llanta se marcará como
                        <b className="font-black text-rose-900 dark:text-rose-100">
                          {" "}
                          inactiva permanentemente{" "}
                        </b>
                        en el inventario.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/*  CAPA 4: FOOTER TAHOE (Botón semántico) */}
            <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px]",
                    currentTipo === "desecho"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                      : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : currentTipo === "desecho" ? (
                    <Trash2 className="mr-2 h-4 w-4" />
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
