// src/features/flota/CreateTireModal.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns"; // 🚀 Importante para formatear la fecha al guardar
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
import { CirclePlus, Pencil, Loader2, Check } from "lucide-react";
import { Tire } from "@/types/api.types";
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
import { DatePicker } from "@/components/ui/date-picker"; // 🚀 Nuestro nuevo componente

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
  // 🚀 Ahora exigimos un objeto Date en lugar de un string
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

  // 🚀 REACT HOOK FORM
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
      fecha_compra: new Date(), // 🚀 Objeto Date en lugar de string
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
          // 🚀 Convertimos el string YYYY-MM-DD del backend a Date (añadimos T12:00:00 para evitar saltos de zona horaria)
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
          fecha_compra: new Date(), // 🚀 Objeto Date
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
        // 🚀 Volvemos a convertir el Date al formato de string que espera el backend
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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !loading) onOpenChange(false);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/* 🚀 HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                isEditing ? "bg-blue-500/20" : "bg-emerald-500/20",
              )}
            >
              {isEditing ? (
                <Pencil className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              ) : (
                <CirclePlus className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                {isEditing ? "Editar Llanta" : "Alta de Nueva Llanta"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                {isEditing
                  ? "Modifica los datos generales del neumático."
                  : "Registra un neumático nuevo en el inventario (Stock)."}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* ID / Código */}
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
                            className={cn(
                              "h-11 font-mono font-bold uppercase shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10",
                              isEditing &&
                                "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed",
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Marca */}
                  <FormField
                    control={form.control}
                    name="marca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Marca
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-black uppercase text-xs glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                            {MARCAS_COMUNES.map((m) => (
                              <SelectItem
                                key={m}
                                value={m}
                                className="font-bold uppercase text-xs"
                              >
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Modelo */}
                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Modelo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11 font-bold uppercase glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Medida */}
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
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* DOT */}
                  <FormField
                    control={form.control}
                    name="dot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">DOT</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={4}
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Profundidad Original */}
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
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Precio de Compra */}
                  <FormField
                    control={form.control}
                    name="precio_compra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Precio de Compra</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-11 font-mono font-bold glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Proveedor */}
                  <FormField
                    control={form.control}
                    name="proveedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Proveedor</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-11 font-bold uppercase glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 🚀 Fecha de Compra usando DatePicker Tahoe */}
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

            {/* 🚀 FOOTER TAHOE */}
            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="w-full sm:w-auto haptic-press flex-shrink-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={loading}
                  className={cn(
                    "w-full sm:w-auto haptic-press flex-shrink-0 border-none",
                    isEditing
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
                  )}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
