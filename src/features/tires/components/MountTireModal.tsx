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
import {
  ArrowDownToLine,
  MapPin,
  Search,
  Loader2,
  Check,
  Truck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { FleetTiresService } from "@/api/generated";
import { TIRE_POSITIONS } from "@/features/tires/utils/tireUtils";
import { Tire } from "@/features/tires/types";

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

  //  REACT HOOK FORM
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
      const allTires =
        (await FleetTiresService.readTiresApiFleetTiresGet()) as any[];
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
      await FleetTiresService.assignTireApiFleetTiresTireIdAssignPost(
        Number(data.selectedTireId),
        {
          unit_id: unitId,
          posicion: Number(data.selectedPosition),
        },
      );

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
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/*  CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner shrink-0">
              <ArrowDownToLine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Montaje de Neumático
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate tracking-normal normal-case">
                Asignación de stock a unidad{" "}
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  ECO-{unitId}
                </span>
                .
              </p>
            </div>
          </div>
        </DialogHeader>

        {/*  CAPA 3: BODY FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-muted/50 custom-scrollbar">
              <div className="space-y-8">
                {/* 🏷️ SECCIÓN 1: Selección de Inventario */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 flex items-center gap-2 border-b border-border pb-2">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    Inventario en Almacén
                  </h3>

                  <FormField
                    control={form.control}
                    name="selectedTireId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Seleccionar Llanta Disponible
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loadingTires || isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-black uppercase text-xs shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue
                                placeholder={
                                  loadingTires
                                    ? "Sincronizando Almacén..."
                                    : "Buscar por ID / Código..."
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border max-h-[40vh]">
                            {availableTires.length === 0 && !loadingTires ? (
                              <div className="p-4 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  Sin existencias disponibles
                                </p>
                              </div>
                            ) : (
                              availableTires.map((t) => (
                                <SelectItem
                                  key={t.id}
                                  value={t.id.toString()}
                                  className="font-bold text-xs uppercase"
                                >
                                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 mr-3 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                                    {t.codigo_interno}
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-200 tracking-tight">
                                    {t.marca} {t.modelo}
                                  </span>
                                  <span className="ml-2 text-[9px] text-slate-400 font-medium">
                                    ({t.profundidad_actual}mm)
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
                </div>

                {/*  SECCIÓN 2: Posicionamiento */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 flex items-center gap-2 border-b border-border pb-2">
                    <Truck className="h-3.5 w-3.5 text-emerald-500" />
                    Ubicación en Unidad
                  </h3>

                  <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <FormField
                      control={form.control}
                      name="selectedPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Seleccionar Posición de Montaje
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold text-xs bg-card border-slate-200 dark:border-white/10 shadow-sm text-slate-800 dark:text-slate-100">
                                <SelectValue placeholder="Seleccionar posición (1 al 10)..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border">
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
            </div>

            {/*  CAPA 4: FOOTER TAHOE */}
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
                  variant="default"
                  size="lg"
                  disabled={isSubmitting || availableTires.length === 0}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 bg-brand-green hover:bg-[hsl(152,100%,24%)] text-white border-none shadow-lg shadow-brand-green/20 font-black uppercase tracking-widest text-[10px]"
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
