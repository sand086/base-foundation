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
  Timer,
  RefreshCcw,
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

// importacion de tus componentes corregidos
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const verifySchema = z.object({
  code: z.string().length(6, "El código debe tener 6 dígitos"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function Verify2FA() {
  const [apiError, setApiError] = useState("");
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Timers: Resend (30s) y Validez (5min)
  const [resendTimer, setResendTimer] = useState(0);
  const [validityTimer, setValidityTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const tempToken = location.state?.tempToken;
  const tempUser = location.state?.user;

  useEffect(() => {
    if (!tempToken) navigate("/login", { replace: true });
  }, [tempToken, navigate]);

  // Lógica de cuenta regresiva (Independiente de los renders)
  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setValidityTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const handleRequestEmailCode = async () => {
    if (resendTimer > 0) return;

    setIsSendingEmail(true);
    setApiError("");
    try {
      await (authService as any).requestEmergencyCode(tempToken);
      setIsEmailMode(true);
      setResendTimer(30); // 30 segundos de cooldown real
      setValidityTimer(300); // 5 minutos de validez

      toast({
        title: "Código de emergencia enviado",
        description: `Enviamos el acceso a: ${tempUser?.email}`,
      });
    } catch (err) {
      setApiError("Error de comunicación. Intenta de nuevo.");
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
        navigate("/", { replace: true });
      }
    } catch (err) {
      setApiError("Token de seguridad inválido. Verifica e intenta de nuevo.");
      // NO reseteamos los timers aquí para que el cooldown de 30s se mantenga
    }
  };

  if (!tempToken) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* Background sutil Glassmorphism */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 animate-[subtle-float_40s_linear_infinite]"
          style={{ backgroundImage: `url(${logos_3t?.login_bg_3t || ""})` }}
        />
        <div
          className={cn(
            "absolute inset-0 transition-colors duration-1000",
            isEmailMode ? "bg-blue-900/10" : "bg-brand-red/5",
          )}
        />
      </div>

      {/* Card Ensanchado Horizontalmente para Desktop */}
      <div className="relative z-10 w-full max-w-[400px] lg:max-w-[540px] px-6 animate-in fade-in zoom-in-95 duration-500">
        <button
          onClick={() => navigate("/login")}
          className="group mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Cancelar acceso
        </button>

        <Card className="overflow-hidden rounded-[3.5rem] border-white/[0.05] bg-white/[0.02] backdrop-blur-[60px] shadow-none ring-1 ring-white/10">
          <CardContent className="p-10 lg:p-20">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-12">
                <div
                  className={cn(
                    "absolute inset-0 rounded-[2rem] blur-2xl opacity-20",
                    isEmailMode ? "bg-blue-500" : "bg-brand-red",
                  )}
                />
                <div
                  className={cn(
                    "relative flex h-24 w-24 items-center justify-center rounded-[2.2rem] border border-white/10 transition-all",
                    isEmailMode
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-brand-red/20 text-brand-red",
                  )}
                >
                  {isEmailMode ? (
                    <Mail size={42} strokeWidth={1.5} />
                  ) : (
                    <ShieldCheck size={42} strokeWidth={1.5} />
                  )}
                </div>
              </div>

              <h1 className="uppercase text-2xl lg:text-5xl font-black uppercase tracking-tighter text-white heading-crisp">
                {isEmailMode ? "Acceso Auxiliar" : "Confirmación de Identidad"}
              </h1>

              <p className="mt-6 text-sm lg:text-lg font-medium text-slate-400 max-w-lg mx-auto leading-relaxed">
                {isEmailMode
                  ? "Revisa tu bandeja de entrada. Introduce el código único de recuperación para entrar al sistema."
                  : `Hola ${tempUser?.nombre.split(" ")[0]}, protege tu cuenta ingresando el token de tu aplicación.`}
              </p>
            </div>

            {apiError && (
              <div className="mt-10 flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 justify-center animate-shake">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <p className="text-[11px] font-black text-rose-200 uppercase tracking-widest">
                  {apiError}
                </p>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-14 space-y-12"
              >
                {/* INPUT OTP CORREGIDO (Sin prop render para evitar error slots undefined) */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          {...field}
                          containerClassName="gap-2" // Reduce el espacio general
                        >
                          <InputOTPGroup className="gap-1.5">
                            <InputOTPSlot
                              index={0}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                            <InputOTPSlot
                              index={1}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                            <InputOTPSlot
                              index={2}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                          </InputOTPGroup>

                          <InputOTPSeparator />

                          <InputOTPGroup className="gap-1.5">
                            <InputOTPSlot
                              index={3}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                            <InputOTPSlot
                              index={4}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                            <InputOTPSlot
                              index={5}
                              className="h-12 w-10 lg:h-14 lg:w-12 text-xl lg:text-2xl"
                            />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>

                      {isEmailMode && validityTimer > 0 && (
                        <div className="mt-10 flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 px-5 py-2 rounded-full border border-blue-500/20">
                          <Timer size={14} className="animate-pulse" />
                          Expira en {Math.floor(validityTimer / 60)}:
                          {(validityTimer % 60).toString().padStart(2, "0")}
                        </div>
                      )}
                      <FormMessage className="text-rose-400 font-bold uppercase text-[10px] mt-6" />
                    </FormItem>
                  )}
                />

                <div className="space-y-8">
                  <Button
                    type="submit"
                    disabled={isSubmitting || form.watch("code").length < 6}
                    className={cn(
                      "h-12 lg:h-14 w-full rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all duration-500 haptic-press shadow-none",
                      isEmailMode
                        ? "bg-blue-600 hover:bg-blue-500"
                        : "bg-brand-red hover:bg-red-600",
                      "disabled:opacity-20 border-0",
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      "Confirmar e Ingresar"
                    )}
                  </Button>
                  {/* Footer Options */}
                  <div className="flex flex-col items-center gap-6">
                    {!isEmailMode ? (
                      <button
                        type="button"
                        onClick={handleRequestEmailCode}
                        disabled={isSendingEmail}
                        className="group flex flex-col items-center gap-1.5 p-4 w-full rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-white/30 group-hover:text-brand-red transition-colors">
                          <LifeBuoy size={14} /> ¿Problemas con tu dispositivo?
                        </div>
                        <span className="text-[9px] font-medium text-white/10 group-hover:text-white/40">
                          Solicitar acceso temporal por correo
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-6">
                        <button
                          type="button"
                          disabled={resendTimer > 0 || isSendingEmail}
                          onClick={handleRequestEmailCode}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-blue-400 disabled:opacity-30 hover:text-blue-300 transition-all"
                        >
                          {resendTimer > 0 ? (
                            <>
                              <RefreshCcw size={12} className="animate-spin" />{" "}
                              Reintentar en {resendTimer}s
                            </>
                          ) : (
                            "Reenviar código al correo"
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEmailMode(false)}
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/50 flex items-center gap-2"
                        >
                          <Smartphone size={14} /> Volver al autenticador
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
