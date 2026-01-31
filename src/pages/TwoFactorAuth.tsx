import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Smartphone,
  Copy,
  QrCode,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationState {
  tempToken: string;
  user?: {
    nombre: string;
    email: string;
  };
}

// ============================================
// MOCK DATA - CAMBIA ESTO PARA PROBAR DISEÑOS
// ============================================
const MOCK_IS_SETUP_REQUIRED = true; // true = Modo Config QR | false = Modo Verificación

const MOCK_QR_DATA = {
  secret: "JBSWY3DPEHPK3PXP",
  qrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Rapidos3T:usuario@ejemplo.com?secret=JBSWY3DPEHPK3PXP&issuer=Rapidos3T"
};
// ============================================

export default function TwoFactorAuth() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [copied, setCopied] = useState(false);
  const [isSetupMode] = useState(MOCK_IS_SETUP_REQUIRED);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = location.state as LocationState | null;
  const tempToken = state?.tempToken;
  const userName = state?.user?.nombre || "Usuario";

  // Redirect if no temp token (only for verification mode from login flow)
  useEffect(() => {
    // Solo redirigir si estamos en modo verificación Y no hay token
    if (!isSetupMode && !tempToken && location.pathname === "/verify-2fa") {
      navigate("/login", { replace: true });
    }
  }, [tempToken, navigate, isSetupMode, location.pathname]);

  // Countdown timer (solo para modo verificación)
  useEffect(() => {
    if (isSetupMode) return; // No countdown en modo setup

    if (countdown <= 0) {
      toast({
        title: "Sesión expirada",
        description: "El tiempo de verificación ha expirado. Inicia sesión nuevamente.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate, toast, isSetupMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6 && !isSetupMode) {
      handleVerify();
    }
  }, [code, isSetupMode]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Ingresa el código completo de 6 dígitos");
      return;
    }

    setError("");
    setIsVerifying(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (code === "123456") {
      toast({
        title: isSetupMode ? "2FA Activado" : "Verificación exitosa",
        description: isSetupMode 
          ? "Tu cuenta ahora está protegida con doble factor" 
          : "Bienvenido al sistema",
      });

      login("admin", "admin");
      navigate("/", { replace: true });
    } else {
      setError("Código incorrecto. Intenta de nuevo.");
      setCode("");
    }

    setIsVerifying(false);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_QR_DATA.secret);
      setCopied(true);
      toast({
        title: "Copiado",
        description: "Clave secreta copiada al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar la clave",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate("/login", { replace: true });
  };

  // Solo bloquear renderizado si es modo verificación sin token
  if (!isSetupMode && !tempToken && location.pathname === "/verify-2fa") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Background with subtle animation */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/10 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <Card className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_8px_64px_rgba(0,0,0,0.5)]">
          <CardContent className="px-10 py-10">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-red/20 to-brand-red/5 border border-brand-red/30 shadow-[0_0_30px_rgba(190,8,17,0.3)]">
                {isSetupMode ? (
                  <ShieldCheck className="h-10 w-10 text-brand-red drop-shadow-[0_0_10px_rgba(190,8,17,0.5)]" />
                ) : (
                  <Shield className="h-10 w-10 text-brand-red drop-shadow-[0_0_10px_rgba(190,8,17,0.5)]" />
                )}
              </div>
              
              <h1 className="mt-6 text-2xl font-bold text-white">
                {isSetupMode ? "Configura tu Seguridad (2FA)" : "Verificación de Seguridad"}
              </h1>
              
              <p className="mt-2 text-sm text-white/60">
                {isSetupMode 
                  ? "Protege tu cuenta con autenticación de dos factores"
                  : <>Hola <span className="text-white/80 font-medium">{userName}</span>, ingresa el código de tu aplicación autenticadora</>
                }
              </p>
            </div>

            {/* Timer badge (solo modo verificación) */}
            {!isSetupMode && (
              <div className="mt-6 flex justify-center">
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                  countdown <= 60 
                    ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                    : "bg-white/5 text-white/60 border border-white/10"
                }`}>
                  <Loader2 className={`h-4 w-4 ${countdown <= 60 ? "animate-spin" : ""}`} />
                  <span>Tiempo restante: <strong>{formatTime(countdown)}</strong></span>
                </div>
              </div>
            )}

            {/* ========== MODO CONFIGURACIÓN (QR) ========== */}
            {isSetupMode && (
              <div className="mt-8 space-y-6">
                {/* QR Code Frame */}
                <div className="relative mx-auto w-fit">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-red/50 via-brand-red/20 to-transparent blur-sm" />
                  <div className="relative rounded-2xl border border-white/20 bg-white p-4 shadow-[0_0_40px_rgba(190,8,17,0.2)]">
                    <img 
                      src={MOCK_QR_DATA.qrUrl} 
                      alt="QR Code para 2FA"
                      className="h-48 w-48 rounded-lg"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex items-center justify-center gap-2 text-white/50">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">Escanea con Google Authenticator o Authy</span>
                </div>

                {/* Secret Key Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <KeyRound className="h-4 w-4" />
                    Clave Secreta (manual)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={MOCK_QR_DATA.secret}
                      readOnly
                      className="h-12 flex-1 rounded-xl border-white/10 bg-white/5 font-mono text-base tracking-widest text-white/90 focus:border-brand-red/50 focus:ring-brand-red/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopySecret}
                      className="h-12 w-12 rounded-xl border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-transparent px-4 text-xs text-white/40">
                      Confirma el código para activar
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Input */}
            <div className={`flex flex-col items-center gap-6 ${isSetupMode ? 'mt-6' : 'mt-8'}`}>
              <div className="flex items-center gap-3 text-white/40">
                <Smartphone className="h-5 w-5" />
                <span className="text-sm">Código de 6 dígitos</span>
              </div>

              <InputOTP
                value={code}
                onChange={setCode}
                maxLength={6}
                disabled={isVerifying}
                className="gap-2"
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot 
                    index={0} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                  <InputOTPSlot 
                    index={1} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                  <InputOTPSlot 
                    index={2} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                </InputOTPGroup>
                
                <InputOTPSeparator className="text-white/30" />
                
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot 
                    index={3} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                  <InputOTPSlot 
                    index={4} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                  <InputOTPSlot 
                    index={5} 
                    className="h-14 w-12 rounded-xl border-white/20 bg-white/5 text-lg font-bold text-white transition-all focus:bg-white/10 focus:border-brand-red/50 focus:shadow-[0_0_15px_rgba(190,8,17,0.3)]"
                  />
                </InputOTPGroup>
              </InputOTP>

              {/* Action Button */}
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying}
                className="mt-4 h-12 w-full rounded-xl bg-brand-red text-base font-semibold text-white transition-all duration-300 hover:bg-brand-red/90 hover:-translate-y-[2px] hover:shadow-[0_0_30px_rgba(190,8,17,0.5)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none border-0"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isSetupMode ? "Activando..." : "Verificando..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {isSetupMode ? (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        Activar Seguridad
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Verificar Código
                      </>
                    )}
                  </span>
                )}
              </Button>
            </div>

            {/* Back to login */}
            <div className="mt-6 text-center">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </button>
            </div>

            {/* Help text */}
            <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-4">
              <p className="text-xs text-white/40 text-center leading-relaxed">
                {isSetupMode ? (
                  <>
                    Abre tu aplicación autenticadora, escanea el código QR o ingresa la clave secreta manualmente. 
                    Luego introduce el código de 6 dígitos para confirmar la activación.
                  </>
                ) : (
                  <>
                    Abre tu aplicación autenticadora (Google Authenticator, Authy, etc.) 
                    e ingresa el código de 6 dígitos que aparece para{" "}
                    <span className="text-white/60 font-medium">Rápidos 3T - TMS</span>
                  </>
                )}
              </p>
            </div>

            {/* Demo hint */}
            <div className="mt-4 text-center">
              <p className="text-xs text-white/30">
                Demo: usa el código <code className="rounded bg-white/10 px-2 py-0.5 text-white/50">123456</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
