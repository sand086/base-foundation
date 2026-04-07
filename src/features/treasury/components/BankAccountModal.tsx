import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Plus, Save } from "lucide-react";

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

  const isEditMode = !!account; // Variable mágica para saber el modo

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banco: "",
      tipo_cuenta: "operativa",
      numero_cuenta: "",
      moneda: "MXN",
      clabe: "",
      alias: "",
    },
  });

  // 🎯 REACCIONA A LOS CAMBIOS: Rellena o limpia el formulario según el modo
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
        });
      } else {
        form.reset({
          banco: "",
          tipo_cuenta: "operativa",
          numero_cuenta: "",
          moneda: "MXN",
          clabe: "",
          alias: "",
        });
      }
    }
  }, [open, account, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true);

    const payload = {
      ...values,
      banco_logo: bankLogos[values.banco] || "🏦",
    };

    let result;
    if (isEditMode && account) {
      // MODO EDICIÓN
      result = await updateAccount(account.id, payload);
    } else {
      // MODO CREACIÓN
      result = await createAccount({ ...payload, saldo: 0, estatus: "activo" });
    }

    if (result) {
      onOpenChange(false);
    }
    setIsPending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy font-black text-xl">
            <Landmark className="h-6 w-6" />
            {isEditMode ? "Editar Cuenta Bancaria" : "Alta de Cuenta Bancaria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
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
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50">
                          <SelectValue placeholder="Seleccionar banco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {bancos.map((banco) => (
                          <SelectItem
                            key={banco}
                            value={banco}
                            className="rounded-lg cursor-pointer"
                          >
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                              <span>{bankLogos[banco]}</span>
                              {banco}
                            </div>
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
                      Tipo de Cuenta *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem
                          value="operativa"
                          className="rounded-lg cursor-pointer"
                        >
                          Operativa (Salidas)
                        </SelectItem>
                        <SelectItem
                          value="cobranza"
                          className="rounded-lg cursor-pointer"
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

            <div className="grid grid-cols-2 gap-4">
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
                        className="h-11 font-mono text-sm rounded-xl bg-slate-50"
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
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem
                          value="MXN"
                          className="rounded-lg cursor-pointer font-bold text-emerald-700"
                        >
                          🇲🇽 MXN
                        </SelectItem>
                        <SelectItem
                          value="USD"
                          className="rounded-lg cursor-pointer font-bold text-blue-700"
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
                      placeholder="18 dígitos"
                      type="number"
                      maxLength={18}
                      className="h-11 font-mono text-sm tracking-widest rounded-xl bg-slate-50"
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
                    Alias (Identificador Interno) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Fiscal Banamex Principal..."
                      className="h-11 text-sm rounded-xl bg-slate-50 font-bold text-slate-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t mt-2">
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
                className="h-11 px-8 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-black shadow-lg shadow-brand-navy/20"
              >
                {isPending ? (
                  "Procesando..."
                ) : isEditMode ? (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Guardar Cambios
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" /> Dar de Alta
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
