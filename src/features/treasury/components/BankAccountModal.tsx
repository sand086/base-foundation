import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Plus, Save, Loader2, Check, Lock } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { useBankAccounts } from "../hooks/useBankAccounts";
import { BankAccount } from "../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // Usamos sonner para las alertas

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

// 🎯 SCHEMA DE VALIDACIÓN
const formSchema = z.object({
  banco: z.string().min(1, "Debes seleccionar una institución bancaria."),
  tipo_cuenta: z.string().min(1, "Selecciona el tipo de cuenta."),
  numero_cuenta: z
    .string()
    .min(4, "El número debe tener al menos 4 dígitos.")
    .max(20, "El número es demasiado largo."),
  moneda: z.string().min(1, "Selecciona la divisa."),
  clabe: z
    .string()
    .max(18, "La CLABE no puede superar los 18 dígitos.")
    .optional(),
  alias: z
    .string()
    .min(3, "El alias debe tener al menos 3 caracteres para identificarla."),
  saldo_inicial: z.coerce
    .number()
    .min(0, "El saldo no puede ser negativo.")
    .default(0),
});

interface BankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null; // Si viene null, es CREAR. Si trae datos, es EDITAR.
}

export function BankAccountModal({
  open,
  onOpenChange,
  account,
}: BankAccountModalProps) {
  const [isPending, setIsPending] = useState(false);
  const { createAccount, updateAccount } = useBankAccounts();

  // 🎯 ESTADOS PARA EL DESBLOQUEO DE SALDO
  const [showOverride, setShowOverride] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");

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

  // 🎯 REACCIONA A LOS CAMBIOS Y LIMPIA ESTADOS DE SEGURIDAD
  useEffect(() => {
    if (open) {
      setShowOverride(false);
      setMasterPassword("");

      if (isEditMode && account) {
        form.reset({
          banco: account.banco,
          tipo_cuenta: account.tipo_cuenta || "operativa",
          numero_cuenta: account.numero_cuenta,
          moneda: account.moneda || "MXN",
          clabe: account.clabe || "",
          alias: account.alias,
          saldo_inicial: account.saldo || 0,
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
    // 🎯 VALIDACIÓN DE SEGURIDAD SI SE FORZÓ EL SALDO
    if (isEditMode && showOverride) {
      if (masterPassword !== "ADMIN123") {
        toast.error("Contraseña de administrador incorrecta.", {
          description: "No tienes permisos para realizar ajustes de saldo.",
        });
        return;
      }
    }

    setIsPending(true);

    // Evitamos problemas de tipado con 'any' o definimos un tipo temporal
    const payload: any = {
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
      // 🎯 SI SE DESBLOQUEÓ EL SALDO, LO ENVIAMOS AL BACKEND EN EL UPDATE
      if (showOverride) {
        payload.saldo = values.saldo_inicial;
      }
      result = await updateAccount(account.id, payload);
    } else {
      // MODO CREACIÓN NORMAL
      result = await createAccount({
        ...payload,
        saldo: values.saldo_inicial,
        estatus: "activo",
      });
    }

    if (result) {
      onOpenChange(false);
      if (isEditMode && showOverride) {
        toast.success("Ajuste de saldo aplicado exitosamente.");
      }
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
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-border bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="p-6 bg-card border-b border-border relative z-10">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 border",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-200",
              )}
            >
              <Landmark
                className={cn(
                  "h-7 w-7",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                {isEditMode
                  ? "Editar Cuenta Bancaria"
                  : "Alta de Cuenta Bancaria"}
              </DialogTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Configuración y Saldos
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 space-y-6"
          >
            {/* 🎯 CAMPO DE SALDO CON LÓGICA DE OVERRIDE */}
            <FormField
              control={form.control}
              name="saldo_inicial"
              render={({ field }) => (
                <FormItem className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <FormLabel className="text-[10px] font-black text-emerald-800 dark:text-emerald-500 tracking-[0.2em] uppercase flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isEditMode ? "Saldo Actual" : "Saldo Inicial (Apertura)"}
                    </FormLabel>

                    {/* BOTÓN DE DESBLOQUEO SOLO EN EDICIÓN */}
                    {isEditMode && (
                      <Button
                        type="button"
                        variant={showOverride ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setShowOverride(!showOverride)}
                        className="h-7 px-3 text-[9px] uppercase font-black tracking-widest"
                      >
                        {showOverride ? "Cancelar Desbloqueo" : "Ajuste Manual"}
                      </Button>
                    )}
                  </div>

                  <div className="relative mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600/50 dark:text-emerald-500/50">
                      $
                    </span>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={isEditMode && !showOverride}
                        {...field}
                        className={cn(
                          "h-auto p-0 text-4xl font-mono font-black bg-transparent border-none focus-visible:ring-0 shadow-none transition-all",
                          isEditMode && !showOverride
                            ? "text-slate-400 dark:text-slate-600"
                            : "text-emerald-700 dark:text-emerald-400",
                        )}
                      />
                    </FormControl>
                  </div>

                  {/* ALERTA ZONA DE PELIGRO Y CONTRASEÑA */}
                  {isEditMode && showOverride && (
                    <div className="animate-in fade-in slide-in-from-top-2 mt-5 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-300">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 mt-0.5 text-rose-600 dark:text-rose-500 shrink-0" />
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
                              Punto de Corte Activo
                            </p>
                            <p className="text-[11px] font-medium leading-relaxed mt-1 dark:text-rose-300/80">
                              A partir de este ajuste, los nuevos recursos,
                              viajes, cobros y liquidaciones contemplarán este
                              nuevo monto. <br className="hidden sm:block" />
                              <b>Requiere autorización de Administrador.</b>
                            </p>
                          </div>
                          <div className="space-y-1.5 max-w-xs pt-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
                              Contraseña de Autorización
                            </Label>
                            <Input
                              type="password"
                              value={masterPassword}
                              onChange={(e) =>
                                setMasterPassword(e.target.value)
                              }
                              placeholder="••••••••"
                              className="bg-white dark:bg-slate-950 border-rose-200 dark:border-rose-900/50 h-9 font-bold shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="banco"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Institución Bancaria *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card">
                          <SelectValue placeholder="Seleccionar banco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {bancos.map((banco) => (
                          <SelectItem
                            key={banco}
                            value={banco}
                            className="font-bold text-xs uppercase"
                          >
                            <span className="mr-2">{bankLogos[banco]}</span>
                            {banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Tipo de Flujo *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card">
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
                          Cobranza (Entradas)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="numero_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Número de Cuenta *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 0123456789"
                        type="number"
                        className="h-11 font-mono text-sm rounded-xl bg-card"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Divisa Base *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-card font-bold">
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
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clabe"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    CLABE Interbancaria
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="18 dígitos para SPEI"
                      type="number"
                      maxLength={18}
                      className="h-11 font-mono text-sm tracking-widest rounded-xl bg-card"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Alias (Identificador) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Fiscal Banamex Principal..."
                      className="h-11 text-sm rounded-xl bg-card font-bold text-slate-700 dark:text-slate-100"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t border-border mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl font-bold text-slate-500"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 px-8 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-black shadow-lg"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? "Guardar Ajustes" : "Aperturar Cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
