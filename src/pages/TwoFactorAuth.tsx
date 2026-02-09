import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import {
  Shield,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AxiosError } from "axios"; // <--- Importamos AxiosError
import { logos_3t } from "@/assets/img";

interface LocationState {
  tempToken?: string;
  user?: {
    nombre: string;
    email: string;
  };
}

export default function TwoFactorAuth() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(300);

  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = location.state as LocationState | null;
  const tempToken = state?.tempToken;
  const userName = state?.user?.nombre || "Usuario";

  // Seguridad: Redirigir si no hay token temporal
  useEffect(() => {
    if (!tempToken) {
      console.warn("Intento de acceso a 2FA sin token temporal");
      navigate("/login", { replace: true });
    }
  }, [tempToken, navigate]);

  // Timer
  useEffect(() => {
    if (countdown <= 0) {
      toast({
        title: "Sesión expirada",
        description:
          "El tiempo de verificación ha expirado. Inicia sesión nuevamente.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, navigate, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-submit
  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setError("");
    setIsVerifying(true);

    try {
      if (tempToken) {
        await verifyOtp(tempToken, code);
        // Si no hay error, login exitoso
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Error 2FA:", err);

      // === MANEJO DE ERRORES CORREGIDO ===
      if (err instanceof AxiosError) {
        // TypeScript ahora sabe que existe 'response' y 'status'
        const status = err.response?.status;

        if (status === 401) {
          setError("El código es incorrecto o ha expirado.");
        } else {
          setError("Ocurrió un error al verificar. Intenta de nuevo.");
        }
      } else {
        // Error genérico (no http)
        setError("Error de conexión. Verifica tu red.");
      }

      setCode(""); // Limpiar input
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    navigate("/login", { replace: true });
  };

  if (!tempToken) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]"
          style={{
            backgroundImage: `url(${logos_3t?.login_bg_3t || "/assets/img/login-bg.jpg"})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/10 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-4 py-6">
        <Card className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_8px_64px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-red/20 to-brand-red/5 border border-brand-red/30 shadow-[0_0_30px_rgba(190,8,17,0.3)] mb-6">
                <Shield className="h-10 w-10 text-brand-red drop-shadow-[0_0_10px_rgba(190,8,17,0.5)]" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Verificación de Seguridad
              </h1>

              <p className="mt-3 text-base text-white/60 leading-relaxed">
                Hola <span className="text-white font-medium">{userName}</span>,
                ingresa el código de tu aplicación autenticadora.
              </p>
            </div>

            {/* Timer Badge */}
            <div className="mt-6 flex justify-center">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300 ${
                  countdown <= 60
                    ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                    : "bg-white/10 text-white/70 border border-white/10"
                }`}
              >
                <Loader2
                  className={`h-4 w-4 ${countdown <= 60 ? "animate-spin" : ""}`}
                />
                <span>
                  Caduca en:{" "}
                  <span className="font-mono text-white">
                    {formatTime(countdown)}
                  </span>
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 text-sm text-red-200 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Input Section */}
            <div className="mt-8 flex flex-col items-center gap-6">
              <InputOTP
                value={code}
                onChange={setCode}
                maxLength={6}
                disabled={isVerifying}
                render={({ slots }) => (
                  <div className="flex gap-2">
                    <InputOTPGroup className="gap-2">
                      {slots.slice(0, 3).map((slot, index) => (
                        <InputOTPSlot
                          key={index}
                          {...slot}
                          index={index}
                          className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-2xl font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_20px_rgba(190,8,17,0.3)] ring-0 outline-none"
                        />
                      ))}
                    </InputOTPGroup>

                    <InputOTPSeparator className="text-white/20 mx-1" />

                    <InputOTPGroup className="gap-2">
                      {slots.slice(3).map((slot, index) => (
                        <InputOTPSlot
                          key={index + 3}
                          {...slot}
                          index={index + 3}
                          className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-2xl font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_20px_rgba(190,8,17,0.3)] ring-0 outline-none"
                        />
                      ))}
                    </InputOTPGroup>
                  </div>
                )}
              />

              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying}
                className="h-12 w-full rounded-xl bg-brand-red text-base font-semibold text-white transition-all duration-300 hover:bg-brand-red/90 hover:-translate-y-[2px] hover:shadow-[0_0_30px_rgba(190,8,17,0.5)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none border-0"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Validando Código...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Verificar Acceso
                  </span>
                )}
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <button
                onClick={handleBack}
                className="group inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Volver al inicio de sesión
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-white/30">
                ¿Problemas con tu código? Contacta a soporte TI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
