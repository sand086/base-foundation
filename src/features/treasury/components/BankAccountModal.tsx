import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Plus, Save, Loader2 } from "lucide-react"; // Se eliminaron Lock, Eye, EyeOff

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
// Se eliminó axiosClient ya que no verificaremos la contraseña
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
    .transform((val) => val || ""),
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
  // Se eliminaron los estados de masterPassword y showPassword

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
    // 🗑️ Se eliminó la validación de isSaldoModified con masterPassword y axiosClient

    setIsPending(true);

    try {
      const payload: any = {
        banco: values.banco,
        tipo_cuenta: values.tipo_cuenta,
        numero_cuenta: values.numero_cuenta,
        moneda: values.moneda,
        clabe: values.clabe,
        alias: values.alias,
        banco_logo: bankLogos[values.banco] || "🏦",
        // Actualiza el saldo si hubo modificación, sino mantiene el actual
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
        payload.estatus = "activo";
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
      <DialogContent className="w-[95vw] sm:max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20"
                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/20",
              )}
            >
              <Landmark
                className={cn(
                  "h-6 w-6 drop-shadow-md",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
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
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-muted/50 dark:bg-transparent custom-scrollbar space-y-6">
              {/* 💰 SECCIÓN DE SALDO SIMPLIFICADA */}
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
                    {/* 🗑️ Se eliminó el bloque condicional isSaldoModified con el input de password */}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RESTO DE LOS CAMPOS */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Banco *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
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
                        className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
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
                          className="h-11 font-mono bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
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
                        className="h-11 font-mono tracking-widest bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                        placeholder="18 dígitos"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="p-6 sm:p-8 bg-muted/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
              <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className={cn(
                    "w-full sm:w-auto haptic-press border-none text-white font-black uppercase tracking-widest text-[10px]",
                    isEditMode
                      ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)]"
                      : "bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)]",
                  )}
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
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
