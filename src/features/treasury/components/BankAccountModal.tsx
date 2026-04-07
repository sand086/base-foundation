import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Plus, Save, Loader2, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBankAccounts } from "../hooks/useBankAccounts";
import { BankAccount } from "../types";
import { cn } from "@/lib/utils";

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

// 🎯 1. SCHEMA ACTUALIZADO (Con Saldo Inicial)
const formSchema = z.object({
  banco: z.string().min(1, "Selecciona un banco."),
  tipo_cuenta: z.string().min(1, "Selecciona el tipo de cuenta."),
  numero_cuenta: z
    .string()
    .min(4, "Mínimo 4 dígitos.")
    .max(20, "Máximo 20 dígitos."),
  moneda: z.string().min(1, "Selecciona divisa."),
  clabe: z
    .string()
    .max(18, "La CLABE no puede superar los 18 dígitos.")
    .optional(),
  alias: z.string().min(3, "Mínimo 3 caracteres."),
  saldo_inicial: z.coerce.number().min(0, "No puede ser negativo.").default(0),
});

interface BankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
}

export function BankAccountModal({
  open,
  onOpenChange,
  account,
}: BankAccountModalProps) {
  const [isPending, setIsPending] = useState(false);
  const { createAccount, updateAccount } = useBankAccounts();

  const isEditMode = !!account;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banco: "",
      tipo_cuenta: "operativa",
      numero_cuenta: "",
      moneda: "MXN",
      clabe: "",
      alias: "",
      saldo_inicial: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && account) {
        form.reset({
          banco: account.banco,
          tipo_cuenta: account.tipo_cuenta || "operativa",
          numero_cuenta: account.numero_cuenta,
          moneda: account.moneda || "MXN",
          clabe: account.clabe || "",
          alias: account.alias,
          saldo_inicial: account.saldo || 0, // Mostramos el saldo actual, pero estará bloqueado
        });
      } else {
        form.reset({
          banco: "",
          tipo_cuenta: "operativa",
          numero_cuenta: "",
          moneda: "MXN",
          clabe: "",
          alias: "",
          saldo_inicial: 0,
        });
      }
    }
  }, [open, account, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true);

    const payload = {
      banco: values.banco,
      tipo_cuenta: values.tipo_cuenta,
      numero_cuenta: values.numero_cuenta,
      moneda: values.moneda,
      clabe: values.clabe,
      alias: values.alias,
      banco_logo: bankLogos[values.banco] || "🏦",
    };

    let result;
    if (isEditMode && account) {
      result = await updateAccount(account.id, payload);
    } else {
      // 🎯 AL CREAR, ENVIAMOS EL SALDO INICIAL
      result = await createAccount({
        ...payload,
        saldo: values.saldo_inicial,
        estatus: "activo",
      });
    }

    if (result) {
      onOpenChange(false);
    }
    setIsPending(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onOpenChange(false);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 border",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-200",
              )}
            >
              <Landmark
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {isEditMode ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Tesorería y Flujo de Efectivo
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY FORMULARIO */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6"
          >
            {/* SALDO INICIAL (ESTILO PRECIO GIGANTE) */}
            <FormField
              control={form.control}
              name="saldo_inicial"
              render={({ field }) => (
                <FormItem className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 rounded-2xl transition-colors">
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-[10px] font-black text-emerald-800 dark:text-emerald-500 tracking-[0.2em] uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                      Saldo Inicial (Apertura)
                    </FormLabel>
                    {isEditMode && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Bloqueado en Edición
                      </span>
                    )}
                  </div>
                  <div className="relative mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600/50 dark:text-emerald-500/50">
                      $
                    </span>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={isEditMode} // 🔒 BLOQUEADO EN EDICIÓN (Auditoría)
                        {...field}
                        className="h-auto p-0 text-5xl font-mono font-black text-emerald-700 dark:text-emerald-400 bg-transparent border-none focus-visible:ring-0 shadow-none disabled:opacity-100"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            {/* DATOS GENERALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="banco"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel variant="brand" required>
                      Institución Bancaria
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card border-border shadow-sm font-bold uppercase text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {bancos.map((banco) => (
                          <SelectItem
                            key={banco}
                            value={banco}
                            className="font-bold text-xs uppercase"
                          >
                            {bankLogos[banco]} {banco}
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
                name="tipo_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel variant="brand" required>
                      Tipo de Flujo
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card border-border shadow-sm font-bold uppercase text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem
                          value="operativa"
                          className="font-bold text-xs uppercase"
                        >
                          Operativa (Salidas)
                        </SelectItem>
                        <SelectItem
                          value="cobranza"
                          className="font-bold text-xs uppercase"
                        >
                          Cobranza (Ingresos)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel variant="brand" required>
                      Número de Cuenta
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 0123456789"
                        type="number"
                        className="h-11 font-mono text-sm rounded-xl bg-card shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel variant="brand" required>
                      Divisa
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card shadow-sm font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem
                          value="MXN"
                          className="font-bold text-emerald-700"
                        >
                          🇲🇽 MXN
                        </SelectItem>
                        <SelectItem
                          value="USD"
                          className="font-bold text-blue-700"
                        >
                          🇺🇸 USD
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clabe"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel variant="brand">CLABE Interbancaria</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="18 dígitos"
                      type="number"
                      maxLength={18}
                      className="h-11 font-mono tracking-widest rounded-xl bg-card shadow-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel variant="brand" required>
                    Alias (Identificador Interno)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Fiscal Banamex Principal..."
                      className="h-11 text-sm rounded-xl bg-card font-bold shadow-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* FOOTER TAHOE */}
            <div className="pt-6 border-t border-border mt-8 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="w-full sm:w-auto font-black text-white bg-brand-navy hover:bg-brand-navy/90 shadow-lg shadow-brand-navy/20"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? "Actualizar Cuenta" : "Aperturar Cuenta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
