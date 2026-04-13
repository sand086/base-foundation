// src/features/cxp/SupplierModal.tsx
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  CreditCard,
  Phone,
  Check,
  Loader2,
  Save,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Supplier } from "../types";
import { cn } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ==========================================
// CONFIGURACIÓN DE BANCOS HOMOLOGADA
// ==========================================
const bancos = [
  "Banamex",
  "Santander",
  "Banorte",
  "BBVA",
  "HSBC",
  "Scotiabank",
];

const bankLogos: Record<string, string> = {
  Banamex: "🏛️",
  Santander: "🏦",
  Banorte: "💳",
  BBVA: "🏧",
  HSBC: "🦁",
  Scotiabank: "🍁",
};

// ==========================================
// ESQUEMA DE VALIDACIÓN ZOD (NATIVO)
// ==========================================
const supplierSchema = z
  .object({
    razon_social: z.string().min(1, "La Razón Social es obligatoria"),
    rfc: z
      .string()
      .min(12, "El RFC debe tener al menos 12 caracteres")
      .max(13, "El RFC no puede superar 13 caracteres"),
    // FIX TYPESCRIPT: Usamos enum en lugar de string genérico
    estatus: z.enum(["activo", "inactivo", "suspendido"]).default("activo"),
    tipo_proveedor: z.string().optional().default(""),
    dias_credito: z.coerce.number().min(0, "No puede ser negativo").default(0),
    contacto_principal: z.string().optional().default(""),
    telefono: z.string().optional().default(""),
    email: z.string().email("Correo inválido").optional().or(z.literal("")),
    direccion: z.string().optional().default(""),
    banco: z.string().optional().default(""),
    cuenta_bancaria: z.string().optional().default(""),
    clabe: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.clabe && data.clabe.length > 0 && data.clabe.length !== 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La CLABE debe tener exactamente 18 dígitos",
        path: ["clabe"],
      });
    }
  });

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  defaultCredito?: number;
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
}

export function SupplierModal({
  open,
  onOpenChange,
  supplier,
  defaultCredito,
  onSubmit,
}: SupplierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!supplier;

  // INICIALIZACIÓN DE REACT HOOK FORM
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      razon_social: "",
      rfc: "",
      estatus: "activo",
      tipo_proveedor: "",
      dias_credito: defaultCredito || 0,
      contacto_principal: "",
      telefono: "",
      email: "",
      direccion: "",
      banco: "",
      cuenta_bancaria: "",
      clabe: "",
    },
  });

  // SINCRONIZACIÓN DE DATOS AL ABRIR EL MODAL
  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          razon_social: supplier.razon_social || "",
          rfc: supplier.rfc || "",
          estatus: (supplier.estatus as any) || "activo",
          tipo_proveedor: supplier.tipo_proveedor || "",
          dias_credito: supplier.dias_credito || 0,
          contacto_principal: supplier.contacto_principal || "",
          telefono: supplier.telefono || "",
          email: supplier.email || "",
          direccion: supplier.direccion || "",
          banco: supplier.banco || "",
          cuenta_bancaria: supplier.cuenta_bancaria || "",
          clabe: supplier.clabe || "",
        });
      } else {
        form.reset({
          razon_social: "",
          rfc: "",
          estatus: "activo",
          tipo_proveedor: "",
          dias_credito: defaultCredito || 0,
          contacto_principal: "",
          telefono: "",
          email: "",
          direccion: "",
          banco: "",
          cuenta_bancaria: "",
          clabe: "",
        });
      }
    }
  }, [open, supplier, defaultCredito, form]);

  // MANEJADOR DE SUBMIT NATIVO (Sin validación manual con Toasts)
  const handleFormSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      // 🧹 LIMPIEZA DE DATOS: Convertimos strings vacíos a null para que FastAPI/Pydantic no llore
      const payload = {
        ...data,
        email: data.email?.trim() === "" ? null : data.email?.trim(),
        // Opcional: Puedes hacer lo mismo con otros campos si el backend te da problemas similares
        telefono: data.telefono?.trim() === "" ? null : data.telefono?.trim(),
        clabe: data.clabe?.trim() === "" ? null : data.clabe?.trim(),
      };

      await onSubmit(payload as Partial<Supplier>);
      onOpenChange(false);
    } catch (e) {
      toast.error("Ocurrió un error al guardar el proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}
    >
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
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
              <Building2
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
                {isEditMode ? "Editar Proveedor" : "Alta de Proveedor"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Catálogo de proveedores y servicios
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY Y FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex-1 overflow-y-auto flex flex-col custom-scrollbar"
          >
            <div className="flex-1 p-6 sm:p-8 bg-muted/50 dark:bg-transparent space-y-8">
              {/* SECCIÓN 1: DATOS GENERALES */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
                  <Building2 className="h-3 w-3 text-slate-500 dark:text-slate-400" />{" "}
                  Datos Generales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="razon_social"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel variant="brand" required>
                          Razón Social
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Transportes Logísticos SA de CV"
                            className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rfc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          RFC
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                            placeholder="Ej: XAXX010101000"
                            maxLength={13}
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Estatus</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            <SelectItem
                              value="activo"
                              className="font-bold uppercase text-xs"
                            >
                              🟢 Activo
                            </SelectItem>
                            <SelectItem
                              value="inactivo"
                              className="font-bold uppercase text-xs text-slate-500"
                            >
                              ⚪ Inactivo
                            </SelectItem>
                            <SelectItem
                              value="suspendido"
                              className="font-bold uppercase text-xs text-rose-500"
                            >
                              🔴 Suspendido
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_proveedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Tipo de Proveedor</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            <SelectItem
                              value="hombre_camion"
                              className="font-bold text-xs uppercase"
                            >
                              Hombre-Camión
                            </SelectItem>
                            <SelectItem
                              value="flota"
                              className="font-bold text-xs uppercase"
                            >
                              Flota
                            </SelectItem>
                            <SelectItem
                              value="agencia"
                              className="font-bold text-xs uppercase"
                            >
                              Agencia Aduanal
                            </SelectItem>
                            <SelectItem
                              value="refaccionaria"
                              className="font-bold text-xs uppercase"
                            >
                              Refaccionaria / Taller
                            </SelectItem>
                            <SelectItem
                              value="servicios"
                              className="font-bold text-xs uppercase"
                            >
                              Servicios Generales
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dias_credito"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          Días de Crédito Base
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            min={0}
                            placeholder="Ej: 15"
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
                  <Phone className="h-3 w-3 text-slate-500 dark:text-slate-400" />{" "}
                  Contacto y Ubicación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contacto_principal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          Contacto Principal
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Lic. Juan Pérez"
                            className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: 55 1234 5678"
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel variant="brand">
                          Correo Electrónico
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            placeholder="ejemplo@proveedor.com"
                            className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel variant="brand">Dirección Física</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Av. Principal 123, Col. Centro"
                            className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SECCIÓN 3: DATOS BANCARIOS (Homologado a Cuentas Bancarias) */}
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
                  <CreditCard className="h-3 w-3 text-slate-500 dark:text-slate-400" />{" "}
                  Datos Bancarios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SELECT DE BANCOS HOMOLOGADO */}
                  <FormField
                    control={form.control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel variant="brand">
                          Institución Bancaria
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                              <SelectValue placeholder="Seleccione un Banco..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/95 backdrop-blur-xl border-border">
                            {bancos.map((b) => (
                              <SelectItem
                                key={b}
                                value={b}
                                className="font-bold text-xs uppercase"
                              >
                                {bankLogos[b]} {b}
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
                    name="cuenta_bancaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Cuenta Bancaria</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: 0123456789"
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clabe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          CLABE (18 dígitos)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.replace(/\D/g, ""))
                            }
                            maxLength={18}
                            placeholder="Ej: 012345678901234567"
                            className="h-11 font-mono uppercase font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    "w-full sm:w-auto haptic-press border-none text-white font-black uppercase tracking-widest text-[10px] flex-shrink-0",
                    isEditMode
                      ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)]"
                      : "bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)]",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isEditMode ? (
                    <Save className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isEditMode ? "Guardar Cambios" : "Registrar Proveedor"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
