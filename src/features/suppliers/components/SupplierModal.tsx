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
  Loader2,
  Save,
  Plus,
  PieChart,
  MapPin,
  ShieldCheck,
  Wallet,
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
// ESQUEMA DE VALIDACIÓN ZOD (COMPLETO)
// ==========================================
const supplierSchema = z
  .object({
    razon_social: z
      .string()
      .min(1, "La Razón Social es obligatoria")
      .max(200, "Máximo 200 caracteres"),
    rfc: z
      .string()
      .min(12, "El RFC debe tener al menos 12 caracteres")
      .max(13, "El RFC no puede superar 13 caracteres"),
    estatus: z.enum(["activo", "inactivo", "suspendido"]).default("activo"),
    tipo_proveedor: z.string().optional().default(""),
    categoria: z.string().optional().default(""),

    // Números (Coerce para manejar inputs de texto como numbers)
    dias_credito: z.coerce.number().min(0, "No puede ser negativo").default(0),
    limite_credito: z.coerce
      .number()
      .min(0, "No puede ser negativo")
      .default(0),

    contacto_principal: z.string().optional().default(""),
    telefono: z.string().max(20, "Máximo 20 dígitos").optional().default(""),

    // Zod validará el email SOLO si el usuario escribió algo
    email: z
      .string()
      .email("Debe ser un correo electrónico válido")
      .optional()
      .or(z.literal("")),

    // Ubicación
    direccion: z.string().optional().default(""),
    codigo_postal: z.string().max(10, "CP inválido").optional().default(""),
    zonas_cobertura: z
      .string()
      .max(255, "Demasiado largo")
      .optional()
      .default(""),

    // Bancos
    banco: z.string().optional().default(""),
    cuenta_bancaria: z.string().optional().default(""),
    clabe: z.string().optional().default(""),

    cost_center_id: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.clabe &&
      data.clabe.trim().length > 0 &&
      data.clabe.trim().length !== 18
    ) {
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
  costCenters?: any[];
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
}

export function SupplierModal({
  open,
  onOpenChange,
  supplier,
  defaultCredito,
  costCenters = [],
  onSubmit,
}: SupplierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!supplier;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      razon_social: "",
      rfc: "",
      estatus: "activo",
      tipo_proveedor: "",
      categoria: "",
      dias_credito: defaultCredito || 0,
      limite_credito: 0,
      contacto_principal: "",
      telefono: "",
      email: "",
      direccion: "",
      codigo_postal: "",
      zonas_cobertura: "",
      banco: "",
      cuenta_bancaria: "",
      clabe: "",
      cost_center_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          razon_social: supplier.razon_social || "",
          rfc: supplier.rfc || "",
          estatus: (supplier.estatus as any) || "activo",
          tipo_proveedor: supplier.tipo_proveedor || "",
          categoria: supplier.categoria || "",
          dias_credito: supplier.dias_credito || 0,
          limite_credito: supplier.limite_credito || 0,
          contacto_principal: supplier.contacto_principal || "",
          telefono: supplier.telefono || "",
          email: supplier.email || "",
          direccion: supplier.direccion || "",
          codigo_postal: supplier.codigo_postal || "",
          zonas_cobertura: supplier.zonas_cobertura || "",
          banco: supplier.banco || "",
          cuenta_bancaria: supplier.cuenta_bancaria || "",
          clabe: supplier.clabe || "",
          cost_center_id: supplier.cost_center_id
            ? String(supplier.cost_center_id)
            : "",
        });
      } else {
        form.reset({
          razon_social: "",
          rfc: "",
          estatus: "activo",
          tipo_proveedor: "",
          categoria: "",
          dias_credito: defaultCredito || 0,
          limite_credito: 0,
          contacto_principal: "",
          telefono: "",
          email: "",
          direccion: "",
          codigo_postal: "",
          zonas_cobertura: "",
          banco: "",
          cuenta_bancaria: "",
          clabe: "",
          cost_center_id: "",
        });
      }
    }
  }, [open, supplier, defaultCredito, form]);

  const handleFormSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      //  LIMPIEZA TOTAL: FastAPI requiere 'null' en vez de '""' (string vacío)
      // para los campos opcionales como el email.
      const payload = {
        ...data,
        tipo_proveedor: data.tipo_proveedor?.trim() || null,
        categoria: data.categoria?.trim() || null,
        contacto_principal: data.contacto_principal?.trim() || null,
        telefono: data.telefono?.trim() || null,
        email: data.email?.trim() || null,
        direccion: data.direccion?.trim() || null,
        codigo_postal: data.codigo_postal?.trim() || null,
        zonas_cobertura: data.zonas_cobertura?.trim() || null,
        banco: data.banco?.trim() || null,
        cuenta_bancaria: data.cuenta_bancaria?.trim() || null,
        clabe: data.clabe?.trim() || null,
        cost_center_id:
          data.cost_center_id && data.cost_center_id !== "none"
            ? Number(data.cost_center_id)
            : null,
      };

      await onSubmit(payload as Partial<Supplier>);
      onOpenChange(false);
    } catch (e: any) {
      //  MEJORA: Leer el error exacto que envía FastAPI para mostrarlo en pantalla
      const backendError =
        e?.body?.detail?.[0]?.msg ||
        e?.body?.detail ||
        "Ocurrió un error inesperado al guardar";
      toast.error(`Error: ${backendError}`);
      console.error("Error al guardar el proveedor:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}
    >
      <DialogContent className="w-[95vw] sm:max-w-4xl flex flex-col max-h-[95vh] overflow-hidden p-0 border-none shadow-2xl bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 bg-card border-b border-border shrink-0 relative z-10">
          <div className="flex items-center gap-5">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border",
                isEditMode
                  ? "bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:border-amber-500/20"
                  : "bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-500/20",
              )}
            >
              <Building2
                className={cn(
                  "h-7 w-7",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                {isEditMode ? "Editar Proveedor" : "Alta de Proveedor"}
              </DialogTitle>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Gestión de Terceros y Servicios
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex-1 overflow-y-auto flex flex-col custom-scrollbar p-6 sm:p-8 space-y-8"
          >
            {/* 1. SECCIÓN CECO */}
            <div className="p-5 border-l-4 border-l-blue-500 border border-border rounded-r-2xl bg-blue-50/30 dark:bg-blue-900/10 shadow-sm space-y-4">
              <h3 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <PieChart className="h-4 w-4" /> Inteligencia Financiera
              </h3>
              <FormField
                control={form.control}
                name="cost_center_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel variant="brand">
                      Centro de Costos Predeterminado
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 font-bold">
                          <SelectValue placeholder="Seleccione para automatizar gastos..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          value="none"
                          className="italic text-muted-foreground"
                        >
                          Sin asignar
                        </SelectItem>
                        {costCenters.map((ceco) => (
                          <SelectItem
                            key={ceco.id}
                            value={String(ceco.id)}
                            className="font-bold uppercase text-xs"
                          >
                            [{ceco.codigo}] {ceco.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 2. DATOS FISCALES Y NEGOCIO */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                <ShieldCheck className="h-4 w-4" /> Identificación y Negocio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="razon_social"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel variant="brand" required>
                        Razón Social
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11 font-bold uppercase"
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
                          maxLength={13}
                          className="h-11 font-mono font-bold uppercase"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo_proveedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 font-bold">
                            <SelectValue placeholder="Tipo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="refaccionaria">
                            Refaccionaria
                          </SelectItem>
                          <SelectItem value="servicios">Servicios</SelectItem>
                          <SelectItem value="flota">Flota</SelectItem>
                          <SelectItem value="agencia">
                            Agencia Aduanal
                          </SelectItem>
                          <SelectItem value="hombre_camion">
                            Hombre Camión
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Categoría de Gasto</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ej: Diesel, Mantto..."
                          className="h-11 font-bold uppercase"
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
                      <FormLabel variant="brand">Estatus Operativo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="activo">🟢 Activo</SelectItem>
                          <SelectItem value="inactivo">⚪ Inactivo</SelectItem>
                          <SelectItem value="suspendido">
                            🔴 Suspendido
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 3. CONDICIONES DE CRÉDITO */}
            <div className="p-5 bg-muted/30 rounded-2xl space-y-6">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                <Wallet className="h-4 w-4" /> Condiciones Comerciales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dias_credito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Días de Crédito</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="h-11 font-mono font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="limite_credito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">
                        Límite de Crédito ($)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="h-11 font-mono font-bold text-emerald-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 4. LOCALIZACIÓN Y CONTACTO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                  <Phone className="h-4 w-4" /> Contacto
                </h3>
                <FormField
                  control={form.control}
                  name="contacto_principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Nombre de Contacto</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="ejemplo@correo.com"
                          className="h-11 lowercase"
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
                        <Input {...field} className="h-11 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                  <MapPin className="h-4 w-4" /> Ubicación
                </h3>
                <FormField
                  control={form.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Dirección Completa</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigo_postal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">C.P.</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={5}
                            className="h-11 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zonas_cobertura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Zonas</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Bajío..."
                            className="h-11 uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 5. DATOS BANCARIOS */}
            <div className="p-6 border border-dashed rounded-2xl space-y-6 bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                <CreditCard className="h-4 w-4" /> Domiciliación Bancaria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel variant="brand">Banco</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 font-bold">
                            <SelectValue placeholder="Banco..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bancos.map((b) => (
                            <SelectItem key={b} value={b}>
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
                        <Input {...field} className="h-11 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clabe"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-1">
                      <FormLabel variant="brand">CLABE (18 dígitos)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/\D/g, ""))
                          }
                          maxLength={18}
                          className="h-11 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter className="p-6 sm:p-8 bg-card border-t border-border shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            {/*  EL BOTÓN DE SUBMIT INVOCA LA FUNCIÓN DE REACT HOOK FORM */}
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={form.handleSubmit(handleFormSubmit)}
              className={cn(
                "font-black uppercase tracking-widest text-[10px] h-11 px-8",
                isEditMode
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-brand-red hover:bg-brand-red/90",
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
      </DialogContent>
    </Dialog>
  );
}
