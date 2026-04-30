// src/features/flota/CreateTireModal.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns"; //  Importante para formatear la fecha al guardar
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
import {
  CirclePlus,
  Pencil,
  Loader2,
  Check,
  Barcode,
  Settings,
  DollarSign,
} from "lucide-react";
import { Tire } from "@/features/tires/types";
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
import { DatePicker } from "@/components/ui/date-picker"; //  Nuestro nuevo componente

const MARCAS_COMUNES = [
  "Michelin",
  "Bridgestone",
  "Continental",
  "Goodyear",
  "Pirelli",
  "Hankook",
  "Yokohama",
  "Firestone",
  "Otra",
];

interface CreateTireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<boolean>;
  tireToEdit?: Tire | null;
}

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const tireSchema = z.object({
  codigo_interno: z.string().min(2, "El código interno es requerido"),
  marca: z.string().min(1, "La marca es requerida"),
  modelo: z.string().optional(),
  medida: z.string().min(1, "La medida es requerida"),
  dot: z
    .string()
    .max(4, "El DOT no puede tener más de 4 caracteres")
    .optional(),
  profundidad_original: z.string().min(1, "Requerido"),
  precio_compra: z.string().optional(),
  //  Ahora exigimos un objeto Date en lugar de un string
  fecha_compra: z.date({ required_error: "La fecha de compra es requerida" }),
  proveedor: z.string().optional(),
});

type TireFormData = z.infer<typeof tireSchema>;

export function CreateTireModal({
  open,
  onOpenChange,
  onSubmit,
  tireToEdit,
}: CreateTireModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!tireToEdit;

  //  REACT HOOK FORM
  const form = useForm<TireFormData>({
    resolver: zodResolver(tireSchema),
    defaultValues: {
      codigo_interno: "",
      marca: "",
      modelo: "",
      medida: "295/80R22.5",
      dot: "",
      profundidad_original: "",
      precio_compra: "",
      fecha_compra: new Date(), //  Objeto Date en lugar de string
      proveedor: "",
    },
  });

  const { reset, handleSubmit } = form;

  // EFECTO: Rellenar formulario si es edición
  useEffect(() => {
    if (open) {
      if (tireToEdit) {
        reset({
          codigo_interno: tireToEdit.codigo_interno,
          marca: tireToEdit.marca,
          modelo: tireToEdit.modelo || "",
          medida: tireToEdit.medida || "",
          dot: tireToEdit.dot || "",
          profundidad_original:
            tireToEdit.profundidad_original?.toString() || "",
          precio_compra: tireToEdit.precio_compra?.toString() || "",
          //  Convertimos el string YYYY-MM-DD del backend a Date (añadimos T12:00:00 para evitar saltos de zona horaria)
          fecha_compra: tireToEdit.fecha_compra
            ? new Date(`${tireToEdit.fecha_compra}T12:00:00`)
            : new Date(),
          proveedor: tireToEdit.proveedor || "",
        });
      } else {
        reset({
          codigo_interno: "",
          marca: "",
          modelo: "",
          medida: "295/80R22.5",
          dot: "",
          profundidad_original: "",
          precio_compra: "",
          fecha_compra: new Date(), //  Objeto Date
          proveedor: "",
        });
      }
    }
  }, [open, tireToEdit, reset]);

  // =====================
  // SUBMIT
  // =====================
  const onFormSubmit = async (data: TireFormData) => {
    setLoading(true);

    try {
      const prof = parseFloat(data.profundidad_original);
      const precio = parseFloat(data.precio_compra || "0") || 0;

      let payload: any = {
        ...data,
        profundidad_original: prof,
        precio_compra: precio,
        //  Volvemos a convertir el Date al formato de string que espera el backend
        fecha_compra: format(data.fecha_compra, "yyyy-MM-dd"),
      };

      if (!isEditing) {
        payload = {
          ...payload,
          profundidad_actual: prof,
          estado: "nuevo",
          estado_fisico: "buena",
        };
      } else {
        delete payload.codigo_interno;
      }

      const success = await onSubmit(payload);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
        if (!isOpen && !loading) handleClose();
      }}
    >
      {/*  CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/*  CAPA 2: CABECERA */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                isEditing
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30",
              )}
            >
              {isEditing ? (
                <Pencil className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <CirclePlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {isEditing ? "Editar Llanta" : "Alta de Nueva Llanta"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 tracking-normal normal-case">
                {isEditing
                  ? "Modifica los datos generales del neumático."
                  : "Registra un neumático nuevo en el inventario (Stock)."}
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
              <div className="space-y-8">
                {/*  SECCIÓN 1: Identificación */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 flex items-center gap-2 border-b border-border pb-2">
                    <Barcode className="h-3.5 w-3.5 text-blue-500" />
                    Identificación del Neumático
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="codigo_interno"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            ID / Código Interno
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isEditing}
                              placeholder="Ej: LL-001"
                              className={cn(
                                "h-11 font-mono font-bold uppercase shadow-sm bg-card border-border",
                                isEditing &&
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
                      name="dot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            DOT (Fabricación)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={4}
                              placeholder="Ej: 4223"
                              className="h-11 font-mono font-bold uppercase glass-card bg-card border-border shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Marca
                          </FormLabel>
                          <FormControl>
                            <>
                              <Input
                                {...field}
                                list="marcas-comunes"
                                placeholder="Ej: Michelin o marca propia..."
                                className="h-11 font-bold uppercase glass-card bg-card border-border shadow-sm"
                              />
                              <datalist id="marcas-comunes">
                                {MARCAS_COMUNES.map((m) => (
                                  <option key={m} value={m} />
                                ))}
                              </datalist>
                            </>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="modelo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Modelo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: X Multi Z"
                              className="h-11 font-bold uppercase glass-card bg-card border-border shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/*  SECCIÓN 2: Especificaciones Técnicas */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 flex items-center gap-2 border-b border-border pb-2">
                    <Settings className="h-3.5 w-3.5 text-amber-500" />
                    Especificaciones Técnicas
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="medida"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Medida
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ej: 295/80R22.5"
                              className="h-11 font-mono font-bold uppercase glass-card bg-card border-border shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profundidad_original"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand" required>
                            Profundidad Original (mm)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                              placeholder="Ej: 18.5"
                              className="h-11 font-mono font-bold glass-card bg-card border-border shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/*  SECCIÓN 3: Adquisición */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 flex items-center gap-2 border-b border-border pb-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    Datos de Adquisición
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="precio_compra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">
                            Precio de Compra
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
                                placeholder="0.00"
                                className="h-11 pl-7 font-mono font-bold glass-card bg-card border-border shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proveedor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel variant="brand">Proveedor</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nombre de la llantera..."
                              className="h-11 font-bold uppercase glass-card bg-card border-border shadow-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/*  Fecha de Compra usando DatePicker Tahoe */}
                    <FormField
                      control={form.control}
                      name="fecha_compra"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel variant="brand" required>
                            Fecha de Compra
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              placeholder="Selecciona la fecha"
                              modalTitle="Fecha de Compra"
                              className="sm:w-1/2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/*  CAPA 4: FOOTER TAHOE (Con nueva regla de color) */}
            <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>

                {/*  REGLA APLICADA: brand-green para Editar, brand-red para Crear */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={loading}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none text-white font-black uppercase tracking-widest text-[10px]",
                    isEditing
                      ? "bg-brand-green hover:bg-brand-green/80 shadow-emerald-500/20"
                      : "bg-brand-red hover:bg-brand-red/80 shadow-brand-red/20",
                  )}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {loading
                    ? "Guardando..."
                    : isEditing
                      ? "Actualizar Llanta"
                      : "Registrar Llanta"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
