import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User, Lock, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

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

    try {
      // 1. Llamada al Backend Real (vía AuthContext -> AuthService)
      const response = await login(username, password);

      // 2. Caso: El backend dice que el usuario tiene 2FA activado
      if (response?.require_2fa) {
        toast({
          title: "Verificación requerida",
          description: "Ingresa el código de tu autenticador",
        });

        // Redirigimos a la pantalla de verificación pasando el token temporal
        navigate("/verify-2fa", {
          replace: true,
          state: {
            tempToken: response.temp_token,
            user: response.user,
          },
        });
        return;
      }

      // 3. Caso: Login directo exitoso (sin 2FA o ya verificado)
      if (response?.success) {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente",
        });
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      // 4. Manejo de Errores HTTP del Backend
      console.error("Error en login:", err);
      const status = err.response?.status;

      if (status === 401) {
        setError("Usuario o contraseña incorrectos");
      } else if (status === 403) {
        setError("Tu usuario está desactivado. Contacta al administrador.");
      } else if (status === 422) {
        setError("Formato de correo inválido");
      } else {
        setError("No se pudo conectar con el servidor. Verifica tu conexión.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Background image with cinematic overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/10 via-transparent to-transparent" />
      </div>

      {/* Logo top-right */}
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

            {/* Error Message */}
            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-3 text-sm text-red-300 animate-in fade-in slide-in-from-top-2">
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
                  type="email" // Cambiado a email para mejor validación nativa
                  placeholder="correo electrónico"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="login-input h-12 rounded-xl border border-white/20 bg-white/10 pl-11 pr-4 text-[15px] text-white placeholder:text-white/40 transition-all duration-300 focus:bg-white/15 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/12 hover:border-white/25"
                />
              </div>

              {/* Password */}
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
                        "Contacta a sistemas para restablecer tu acceso.",
                    });
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="login-button mt-2 h-12 w-full rounded-xl bg-brand-red text-base font-semibold text-white transition-all duration-300 hover:bg-brand-red/90 hover:-translate-y-[2px] hover:shadow-[0_0_30px_rgba(190,8,17,0.5)] active:translate-y-0 active:shadow-[0_0_15px_rgba(190,8,17,0.3)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none border-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Validando...
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
