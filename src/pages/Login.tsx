import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Lock,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [twoFactor, setTwoFactor] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate backend 2FA check
    // In production, this would call the /auth/login endpoint
    const has2FAEnabled = twoFactor.length > 0; // Demo: if user typed in 2FA field, simulate 2FA flow

    if (has2FAEnabled) {
      // User has 2FA enabled - redirect to verification page
      const tempToken = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      toast({
        title: "Verificación requerida",
        description: "Ingresa el código de tu autenticador",
      });
      
      navigate("/verify-2fa", {
        replace: true,
        state: {
          tempToken,
          user: { nombre: username, email: username },
        },
      });
      setIsLoading(false);
      return;
    }

    // No 2FA - proceed with normal login
    const success = login(username, password);

    if (success) {
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente",
      });
      navigate("/", { replace: true });
    } else {
      setError("Usuario o contraseña incorrectos");
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Background image with cinematic overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]" />
        {/* Cinematic dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50" />
        {/* Subtle brand color accent overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/10 via-transparent to-transparent" />
      </div>

      {/* Logo top-right (solo en md+ para que en móvil se enfoque el form) */}
      <div className="hidden md:block absolute right-16 top-10 z-10 select-none">
        <img
          src="/logo-white.svg"
          alt="transport management system"
          className="h-20 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-6 md:justify-end md:px-16">
        <Card className="login-card w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_8px_64px_rgba(0,0,0,0.5)]">
          <CardContent className="px-10 py-10">
            {/* Title */}
            <div className="text-center">
              <div className="text-5xl font-extrabold tracking-wide text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                TMS
              </div>
              <div className="mx-auto mt-2 h-[6px] w-[150px] rounded-full bg-gradient-to-r from-brand-red via-brand-red/80 to-brand-red shadow-[0_0_20px_rgba(190,8,17,0.5)]" />
              <div className="mt-4 text-sm font-medium tracking-[0.18em] text-white/80">
                TRANSPORT MANAGEMENT SYSTEM
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Email/username */}
              <div className="relative group">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-all duration-300 group-focus-within:text-white group-focus-within:scale-110" />
                <Input
                  id="username"
                  type="text"
                  placeholder="correo electrónico"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="login-input h-12 rounded-xl border border-white/20 bg-white/10 pl-11 pr-4 text-[15px] text-white placeholder:text-white/40 transition-all duration-300 focus:bg-white/15 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/12 hover:border-white/25"
                />
              </div>

              {/* Password with eye */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-all duration-300 group-focus-within:text-white group-focus-within:scale-110" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="login-input h-12 rounded-xl border border-white/20 bg-white/10 pl-11 pr-12 text-[15px] text-white placeholder:text-white/40 transition-all duration-300 focus:bg-white/15 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/12 hover:border-white/25"
                />

                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
                  aria-label={
                    showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPass ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between pt-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-white/60 hover:text-white/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 accent-brand-red"
                  />
                  Recuérdame
                </label>

                <button
                  type="button"
                  className="text-white/50 transition-colors hover:text-white/80"
                  onClick={() => {
                    toast({
                      title: "Recuperación",
                      description:
                        "Aquí iría tu flujo de recuperación de contraseña.",
                    });
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* 2FA */}
              <div className="relative group pt-1">
                <Check className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition-all duration-300 group-focus-within:text-white group-focus-within:scale-110" />
                <Input
                  id="twoFactor"
                  inputMode="numeric"
                  placeholder="doble verificación"
                  value={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.value)}
                  className="login-input h-12 rounded-xl border border-white/20 bg-white/10 pl-11 pr-4 text-[15px] text-white placeholder:text-white/40 transition-all duration-300 focus:bg-white/15 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/12 hover:border-white/25"
                />
              </div>

              {/* Button with glow */}
              <Button
                type="submit"
                disabled={isLoading}
                className="login-button mt-2 h-12 w-full rounded-xl bg-brand-red text-base font-semibold text-white transition-all duration-300 hover:bg-brand-red/90 hover:-translate-y-[2px] hover:shadow-[0_0_30px_rgba(190,8,17,0.5)] active:translate-y-0 active:shadow-[0_0_15px_rgba(190,8,17,0.3)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none border-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    ENTRAR <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <div className="pt-3 text-center text-[11px] text-white/60">
                ¿No tienes acceso? Comunícate con el soporte técnico o con el
                administrador.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
