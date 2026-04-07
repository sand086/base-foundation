import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/features/users/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Smartphone,
  Mail,
  LifeBuoy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logos_3t } from "@/assets/img";
import { AxiosError } from "axios";
import { cn } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const verifySchema = z.object({
  code: z
    .string()
    .length(6, "El código debe tener 6 dígitos")
    .regex(/^\d+$/, "Solo números"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function Verify2FA() {
  const [apiError, setApiError] = useState("");
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const tempToken = location.state?.tempToken;
  const tempUser = location.state?.user;

  useEffect(() => {
    if (!tempToken) navigate("/login", { replace: true });
  }, [tempToken, navigate]);

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  // Lógica para solicitar código por correo
  const handleRequestEmailCode = async () => {
    setIsSendingEmail(true);
    setApiError("");
    try {
      // Deberás crear este método en tu authService
      // await authService.requestEmergencyCode(tempToken);

      setIsEmailMode(true);
      toast({
        title: "Código enviado",
        description: "Revisa tu bandeja de entrada o carpeta de spam.",
      });
    } catch (err) {
      setApiError(
        "No pudimos enviar el correo de emergencia. Contacta a Soporte.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const onSubmit = async (data: VerifyFormData) => {
    setApiError("");
    try {
      const response = await authService.verify2FA({
        temp_token: tempToken,
        code: data.code,
      });

      if (response.access_token && response.user && response.refresh_token) {
        login(response.user, response.access_token, response.refresh_token);
        toast({
          title: "Bienvenido de nuevo",
          description: "Acceso verificado exitosamente.",
        });
        navigate("/", { replace: true });
      }
    } catch (err) {
      setApiError("El código ingresado no coincide. Intenta de nuevo.");
    }
  };

  if (!tempToken) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* CAPA: Fondo Cinematográfico */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 animate-[subtle-float_30s_ease-in-out_infinite] opacity-40"
          style={{ backgroundImage: `url(${logos_3t?.login_bg_3t || ""})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/40 to-brand-red/20" />
        <div className="absolute inset-0 backdrop-blur-[3px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        <button
          onClick={() => navigate("/login")}
          className="group mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 group-hover:bg-white/20">
            <ArrowLeft size={14} />
          </div>
          Volver al inicio
        </button>

        <Card className="overflow-hidden rounded-[2.5rem] border-white/[0.08] bg-white/[0.02] backdrop-blur-[50px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <CardContent className="p-10">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div
                  className={cn(
                    "absolute inset-0 rounded-3xl blur-2xl transition-colors duration-500",
                    isEmailMode ? "bg-blue-500/30" : "bg-brand-red/40",
                  )}
                />
                <div
                  className={cn(
                    "relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] shadow-xl ring-1 ring-white/20 transition-all duration-500",
                    isEmailMode
                      ? "bg-gradient-to-b from-blue-500 to-blue-700"
                      : "bg-gradient-to-b from-brand-red to-[#900]",
                  )}
                >
                  {isEmailMode ? (
                    <Mail className="h-10 w-10 text-white" />
                  ) : (
                    <ShieldCheck className="h-10 w-10 text-white" />
                  )}
                </div>
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
                {isEmailMode ? "Verificación vía Email" : "Paso de Seguridad"}
              </h1>

              <p className="mt-6 text-sm font-medium leading-relaxed text-slate-400 px-2">
                Hola{" "}
                <span className="text-white font-bold">{tempUser?.nombre}</span>
                .
                {isEmailMode
                  ? " Introduce el código único que enviamos a tu correo institucional."
                  : " Introduce el token de 6 dígitos de tu aplicación autenticadora."}
              </p>
            </div>

            {apiError && (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 animate-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <p className="text-[10px] font-bold text-rose-200 uppercase tracking-wide">
                  {apiError}
                </p>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-10 space-y-8"
              >
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          autoFocus
                          className="h-20 rounded-2xl border-white/10 bg-white/5 text-center text-5xl font-mono font-black tracking-[0.4em] text-white shadow-inner focus:border-brand-red focus:ring-4 focus:ring-brand-red/20 transition-all"
                          placeholder="000000"
                        />
                      </FormControl>
                      <FormMessage className="text-rose-400 text-center text-[10px] font-black uppercase tracking-widest mt-3" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "h-16 w-full rounded-2xl text-xs font-black uppercase tracking-[0.25em] text-white transition-all duration-500 haptic-press",
                    isEmailMode
                      ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                      : "bg-brand-red hover:bg-red-600 shadow-brand-red/20",
                    "disabled:opacity-40 border-0",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Confirmar Acceso"
                  )}
                </Button>

                {/* BOTÓN DE AUXILIO / LOST DEVICE */}
                {!isEmailMode && (
                  <button
                    type="button"
                    onClick={handleRequestEmailCode}
                    disabled={isSendingEmail}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors py-2"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <LifeBuoy size={14} />
                        ¿No tienes tu dispositivo a la mano?
                      </>
                    )}
                  </button>
                )}

                {isEmailMode && (
                  <button
                    type="button"
                    onClick={() => setIsEmailMode(false)}
                    className="w-full text-[10px] font-black uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors py-2"
                  >
                    Usar aplicación autenticadora
                  </button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
