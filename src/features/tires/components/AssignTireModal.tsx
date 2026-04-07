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
import {
  ArrowRightLeft,
  Truck,
  MapPin,
  Loader2,
  Package,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Tire } from "@/features/tires/types";
import { useUnits } from "@/features/units/hooks/useUnits";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

//  MAPEO: IDs numéricos directos para la BD
const TIRE_POSITIONS = [
  { id: "1", label: "Posición 1 (Direccional Izq)" },
  { id: "2", label: "Posición 2 (Direccional Der)" },
  { id: "3", label: "Posición 3 (Tracción Izq Ext)" },
  { id: "4", label: "Posición 4 (Tracción Izq Int)" },
  { id: "5", label: "Posición 5 (Tracción Der Int)" },
  { id: "6", label: "Posición 6 (Tracción Der Ext)" },
  { id: "7", label: "Posición 7 (Tracción 2 Izq Ext)" },
  { id: "8", label: "Posición 8 (Tracción 2 Izq Int)" },
  { id: "9", label: "Posición 9 (Tracción 2 Der Int)" },
  { id: "10", label: "Posición 10 (Tracción 2 Der Ext)" },
];

interface AssignTireModalProps {
  tire: Tire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (
    tireId: string,
    unidad: string | null,
    posicion: number | null,
    notas: string,
  ) => void;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const assignSchema = z
  .object({
    selectedUnit: z.string().min(1, "Debe seleccionar un destino"),
    selectedPosition: z.string().optional(),
    notas: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.selectedUnit &&
      data.selectedUnit !== "almacen" &&
      !data.selectedPosition
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar una posición",
        path: ["selectedPosition"],
      });
    }
  });

type AssignFormData = z.infer<typeof assignSchema>;

export function AssignTireModal({
  tire,
  open,
  onOpenChange,
  onAssign,
}: AssignTireModalProps) {
  const { unidades, isLoading: loadingUnits } = useUnits();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unidadesList = useMemo(() => unidades || [], [unidades]);

  //  REACT HOOK FORM
  const form = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      selectedUnit: "",
      selectedPosition: "",
      notas: "",
    },
  });

  const { watch, setValue, reset, handleSubmit } = form;
  const currentUnit = watch("selectedUnit");

  // Limpiar formulario al abrir/cerrar
  useEffect(() => {
    if (open) {
      reset({ selectedUnit: "", selectedPosition: "", notas: "" });
      setIsSubmitting(false);
    }
  }, [open, reset, tire?.id]);

  // Lógica dinámica para opciones de posición
  const selectedUnitObj = useMemo(
    () => unidadesList.find((u) => u.id.toString() === currentUnit),
    [unidadesList, currentUnit],
  );

  const isTrailer = useMemo(() => {
    if (!selectedUnitObj) return false;
    const tipo =
      selectedUnitObj.tipo_1?.toUpperCase() ||
      selectedUnitObj.configuracion_ejes?.toUpperCase() ||
      "";
    return ["REMOLQUE", "DOLLY", "REMOLQUE_8", "DOLLY_8"].some((t) =>
      tipo.includes(t),
    );
  }, [selectedUnitObj]);

  const availablePositions = isTrailer
    ? TIRE_POSITIONS.filter((p) => parseInt(p.id) > 2)
    : TIRE_POSITIONS;

  // Si selecciona almacén, limpiamos la posición
  useEffect(() => {
    if (currentUnit === "almacen") {
      setValue("selectedPosition", "");
    }
  }, [currentUnit, setValue]);

  if (!tire) return null;

  const isCurrentlyMounted = !!tire.unidad_actual_id;

  // =====================
  // SUBMIT
  // =====================
  const onSubmit = async (data: AssignFormData) => {
    setIsSubmitting(true);
    try {
      if (data.selectedUnit === "almacen") {
        // Desmontaje: Enviar a Stock
        await onAssign(tire.id.toString(), null, null, data.notas || "");
        toast.success("Llanta enviada a almacén correctamente");
      } else {
        // Montaje: Asignar a Unidad
        await onAssign(
          tire.id.toString(),
          data.selectedUnit,
          Number(data.selectedPosition),
          data.notas || "",
        );
        const unit = unidadesList.find(
          (u) => u.id.toString() === data.selectedUnit,
        );
        toast.success(
          `Llanta asignada a ${unit?.numero_economico} en Posición ${data.selectedPosition}`,
        );
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Ocurrió un error al procesar el movimiento");
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
      {/*  CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/*  CAPA 2: CABECERA (Blanca en Light, Navy oscuro en Dark) */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-blue-200 dark:border-blue-500/20">
              <ArrowRightLeft className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Asignar / Rotar
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate tracking-normal normal-case">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                  {tire.codigo_interno}
                </span>{" "}
                • {tire.marca} {tire.medida}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/*  CAPA 3: CUERPO Y FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-muted/30 dark:bg-transparent custom-scrollbar">
              <div className="space-y-6">
                {/*  Ubicación Actual */}
                <div className="p-5 bg-card rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Ubicación Actual
                    </p>
                    <p className="text-sm font-black text-brand-navy dark:text-white uppercase tracking-tight flex items-center gap-2">
                      {isCurrentlyMounted ? (
                        <>
                          <Truck className="h-4 w-4 text-blue-500" />
                          ECO-{tire.unidad_actual_economico} • Pos.{" "}
                          {tire.posicion}
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 text-amber-500" />
                          En Almacén
                        </>
                      )}
                    </p>
                  </div>
                  {isCurrentlyMounted && (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-sm w-fit"
                    >
                      Montada
                    </Badge>
                  )}
                </div>

                {/* 🚚 Selector de Unidad / Almacén */}
                <FormField
                  control={form.control}
                  name="selectedUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand" required>
                        Destino (Unidad o Almacén)
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingUnits || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 font-black uppercase text-xs shadow-sm bg-card border-border text-brand-navy dark:text-slate-100">
                            <SelectValue
                              placeholder={
                                loadingUnits
                                  ? "Cargando catálogo..."
                                  : "Seleccionar destino..."
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border max-h-[40vh]">
                          <SelectItem
                            value="almacen"
                            className="font-bold text-xs uppercase text-amber-600 dark:text-amber-500"
                          >
                            📦 Desmontar / Enviar a Almacén
                          </SelectItem>
                          <div className="h-px bg-border my-1 mx-2" />
                          {unidadesList.map((u) => (
                            <SelectItem
                              key={u.id}
                              value={u.id.toString()}
                              className="font-bold text-xs uppercase"
                            >
                              ECO-{u.numero_economico}
                              <span className="text-muted-foreground/80 ml-2 text-[10px] font-medium tracking-widest normal-case">
                                {u.marca} {u.placas ? `(${u.placas})` : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 🎯 Selector de Posición Numérica */}
                {currentUnit && currentUnit !== "almacen" && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <FormField
                      control={form.control}
                      name="selectedPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            variant="brand"
                            required
                            className="flex items-center gap-2"
                          >
                            Posición en el Vehículo
                            {isTrailer && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                (Ejes Traseros)
                              </span>
                            )}
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold text-xs bg-card border-border shadow-sm text-brand-navy dark:text-slate-100">
                                <SelectValue placeholder="Seleccionar posición (1 al 10)..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border">
                              {availablePositions.map((pos) => (
                                <SelectItem
                                  key={pos.id}
                                  value={pos.id}
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
                )}

                {/* 📝 Notas */}
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">
                        Notas / Observaciones
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Razón del cambio, condición física detectada, etc."
                          className="min-h-[80px] resize-none bg-card border-border shadow-sm font-medium text-sm"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/*  CAPA 4: FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
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
                  className="w-full sm:w-auto haptic-press flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[10px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Confirmar Movimiento
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
