import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Plus, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";

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
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuth } from "@/hooks/useAuth";

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

const formSchema = z.object({
  banco: z.string().min(1, "Debes seleccionar una institución bancaria."),
  tipo_cuenta: z.string().min(1, "Selecciona el tipo de cuenta."),
  numero_cuenta: z
    .string()
    .min(4, "Mínimo 4 dígitos.")
    .max(20, "Máximo 20 dígitos."),
  moneda: z.string().min(1, "Selecciona la divisa."),
  clabe: z
    .string()
    .max(18, "La CLABE no puede superar los 18 dígitos.")
    .optional()
    .nullable()
    .transform((val) => val || ""), // Limpieza de nulos
  alias: z.string().min(3, "El alias debe tener al menos 3 caracteres."),
  saldo_inicial: z.coerce
    .number()
    .min(0, "El saldo no puede ser negativo.")
    .default(0),
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
  const { user } = useAuth();

  const roleKey = user?.role?.name_key;
  const isAdmin = roleKey === "admin" || roleKey === "superadmin";

  const [showOverride, setShowOverride] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const newSaldoValue = form.watch("saldo_inicial");
  const isSaldoModified = isEditMode && newSaldoValue !== (account?.saldo || 0);

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
    if (isEditMode && isSaldoModified) {
      if (!masterPassword) {
        toast.error("Contraseña requerida", {
          description:
            "Debe ingresar su contraseña para autorizar el cambio de saldo.",
        });
        return;
      }
      try {
        await axiosClient.post("/api/auth/verify-password", {
          password: masterPassword,
        });
      } catch (error) {
        toast.error("Error de Autorización", {
          description: "La contraseña ingresada es incorrecta.",
        });
        return;
      }
    }

    setIsPending(true);

    // 🛡️ BLINDAJE CONTRA ERRORES DE RED O DEL BACKEND
    try {
      const payload: any = {
        banco: values.banco,
        tipo_cuenta: values.tipo_cuenta,
        numero_cuenta: values.numero_cuenta,
        moneda: values.moneda,
        clabe: values.clabe,
        alias: values.alias,
        banco_logo: bankLogos[values.banco] || "🏦",
        // En creación SIEMPRE mandamos el saldo inicial. En edición, solo si hubo override
        saldo: isEditMode
          ? isSaldoModified
            ? values.saldo_inicial
            : account.saldo
          : values.saldo_inicial,
      };

      let result;
      if (isEditMode && account) {
        result = await updateAccount(account.id, payload);
      } else {
        payload.estatus = "activo"; // Status por defecto al crear
        result = await createAccount(payload);
      }

      if (result) {
        onOpenChange(false);
        toast.success(
          isEditMode ? "Cuenta actualizada" : "Cuenta creada correctamente",
        );
      } else {
        toast.error("Ocurrió un error al procesar la solicitud.");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          "Ocurrió un error inesperado al contactar con el servidor.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isPending && onOpenChange(isOpen)}
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
            <div className="flex flex-col text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                {isEditMode ? "Ajuste de Cuenta" : "Nueva Cuenta"}
              </DialogTitle>
              <Badge
                variant="outline"
                className="w-fit text-[8px] mt-1 border-slate-200 dark:border-white/10 uppercase font-bold tracking-widest"
              >
                Rol: {roleKey || "Cargando..."}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
          >
            {/* 💰 SECCIÓN DE SALDO CON SEGURIDAD */}
            <FormField
              control={form.control}
              name="saldo_inicial"
              render={({ field }) => (
                <FormItem className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 rounded-2xl transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel className="text-[10px] font-black text-emerald-800 dark:text-emerald-500 tracking-[0.2em] uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isEditMode ? "Saldo Actual" : "Apertura de Saldo"}
                    </FormLabel>

                    {isEditMode && isAdmin && (
                      <Button
                        type="button"
                        variant={showOverride ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => {
                          setShowOverride(!showOverride);
                          if (showOverride) setMasterPassword("");
                        }}
                        className="h-7 px-3 text-[9px] uppercase font-black tracking-widest shadow-sm"
                      >
                        {showOverride ? "Cancelar Ajuste" : "Ajuste Manual"}
                      </Button>
                    )}
                  </div>

                  <div className="relative flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600/50">
                      $
                    </span>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={isEditMode && !showOverride}
                        {...field}
                        className={cn(
                          "h-auto p-0 text-4xl font-mono font-black bg-transparent border-none focus-visible:ring-0 shadow-none",
                          isEditMode && !showOverride
                            ? "text-slate-400"
                            : "text-emerald-700 dark:text-emerald-400",
                        )}
                      />
                    </FormControl>
                  </div>

                  {isSaldoModified && (
                    <div className="mt-5 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-3">
                        <Lock className="h-4 w-4 mt-1 text-rose-600 shrink-0" />
                        <div className="space-y-3 w-full">
                          <p className="text-[11px] font-medium leading-relaxed text-rose-800 dark:text-rose-300">
                            <b>Punto de Corte Activo:</b> Los nuevos recursos y
                            cobros se basarán en este monto. Requiere validación
                            de identidad.
                          </p>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={masterPassword}
                              onChange={(e) =>
                                setMasterPassword(e.target.value)
                              }
                              placeholder="Confirmar Contraseña"
                              className="h-9 text-xs bg-white dark:bg-slate-950 border-rose-200 font-bold pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600"
                            >
                              {showPassword ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="banco"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Banco *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Banco..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bancos.map((b) => (
                          <SelectItem
                            key={b}
                            value={b}
                            className="font-bold text-xs"
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
                name="tipo_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="operativa">Operativa</SelectItem>
                        <SelectItem value="cobranza">Cobranza</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Alias / Identificador *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 font-bold shadow-sm"
                      placeholder="Ej: BBVA Nómina"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_cuenta"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>No. Cuenta *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="h-11 font-mono"
                        placeholder="Ej: 0123456789"
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
                    <FormLabel>Moneda *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/*  EL CAMPO CLABE QUE FALTABA */}
            <FormField
              control={form.control}
              name="clabe"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>CLABE Interbancaria</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      maxLength={18}
                      {...field}
                      className="h-11 font-mono tracking-widest"
                      placeholder="18 dígitos"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t border-border mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-bold text-slate-500"
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 px-8 bg-brand-navy text-white rounded-xl font-black shadow-lg"
              >
                {isPending ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : isEditMode ? (
                  <Save className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isEditMode ? "Guardar Cambios" : "Aperturar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
