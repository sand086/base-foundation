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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDownToLine, MapPin, Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { tireService, TIRE_POSITIONS } from "@/services/tireService";
import { Tire } from "@/types/api.types";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface MountTireModalProps {
  unitId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const mountTireSchema = z.object({
  selectedTireId: z.string().min(1, "Debe seleccionar una llanta del almacén"),
  selectedPosition: z.string().min(1, "Debe seleccionar la posición a montar"),
});

type MountTireFormData = z.infer<typeof mountTireSchema>;

export function MountTireModal({
  unitId,
  open,
  onOpenChange,
  onSuccess,
}: MountTireModalProps) {
  const [availableTires, setAvailableTires] = useState<Tire[]>([]);
  const [loadingTires, setLoadingTires] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 REACT HOOK FORM
  const form = useForm<MountTireFormData>({
    resolver: zodResolver(mountTireSchema),
    defaultValues: {
      selectedTireId: "",
      selectedPosition: "",
    },
  });

  // Cargar llantas disponibles (en almacén) cuando se abre el modal
  useEffect(() => {
    if (open) {
      form.reset({ selectedTireId: "", selectedPosition: "" });
      fetchAvailableTires();
    }
  }, [open, form]);

  const fetchAvailableTires = async () => {
    setLoadingTires(true);
    try {
      const allTires = await tireService.getAll();
      // Filtramos solo las que NO tienen unidad asignada (están en almacén)
      const inStock = allTires.filter(
        (t) => !t.unidad_actual_id && t.estado !== "desecho",
      );
      setAvailableTires(inStock);
    } catch (error) {
      toast.error("Error al cargar las llantas del almacén");
    } finally {
      setLoadingTires(false);
    }
  };

  // =====================
  // SUBMIT
  // =====================
  const onFormSubmit = async (data: MountTireFormData) => {
    setIsSubmitting(true);
    try {
      await tireService.assign(Number(data.selectedTireId), {
        unit_id: unitId,
        posicion: Number(data.selectedPosition),
      });

      toast.success("Llanta montada correctamente en la unidad.");
      onSuccess(); // Recarga la unidad en la vista principal
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al montar la llanta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/* 🚀 HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
              <ArrowDownToLine className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                Montaje desde Almacén
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                Asigna una llanta disponible del inventario a la unidad ECO-
                {unitId}.
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
                {/* Selector de Llanta */}
                <FormField
                  control={form.control}
                  name="selectedTireId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        variant="brand"
                        className="flex items-center gap-2"
                        required
                      >
                        <Search className="h-3.5 w-3.5 text-blue-500" />
                        Seleccionar Llanta en Almacén
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingTires || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 glass-card font-black uppercase text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                            <SelectValue
                              placeholder={
                                loadingTires
                                  ? "Buscando inventario..."
                                  : "Buscar por ID / Código..."
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 max-h-[40vh]">
                          {availableTires.length === 0 && !loadingTires ? (
                            <div className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">
                              No hay llantas disponibles en almacén.
                            </div>
                          ) : (
                            availableTires.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={t.id.toString()}
                                className="font-bold text-xs uppercase"
                              >
                                <span className="font-mono font-black text-blue-600 dark:text-blue-400 mr-2">
                                  {t.codigo_interno}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400 text-[10px] tracking-widest">
                                  {t.marca} {t.modelo} ({t.profundidad_actual}
                                  mm)
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selector de Posición */}
                <div className="animate-in fade-in slide-in-from-top-2">
                  <FormField
                    control={form.control}
                    name="selectedPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          variant="brand"
                          className="flex items-center gap-2"
                          required
                        >
                          <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          Posición a Montar
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 glass-card font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar posición (1 al 10)..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            {TIRE_POSITIONS.map((pos) => (
                              <SelectItem
                                key={pos.id}
                                value={pos.id.toString()}
                                className="font-bold text-xs"
                              >
                                {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                  variant="default"
                  size="lg"
                  disabled={isSubmitting || availableTires.length === 0}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Confirmar Montaje
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
