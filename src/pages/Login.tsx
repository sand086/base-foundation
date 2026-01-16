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
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center" />

      {/* Global dark overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Frosted overlay: FIXED position on md+ (never moves), hidden on mobile */}
      {/* Cut exactly at the left edge of the card:
          card = 520px
          md right padding = 4rem (md:px-16)
          => right = calc(520px + 4rem)
      */}
      <div className="hidden md:block absolute inset-y-0 right-0 bg-white/35 backdrop-blur-[2px] w-full" />

      {/* Logo top-right (solo en md+ para que en móvil se enfoque el form) */}
      <div className="hidden md:block absolute right-16 top-10 z-10 select-none">
        <img
          src="/logo-white.svg"
          alt="transport management system"
          className="h-20 drop-shadow-sm"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-6 md:justify-end md:px-16">
        <Card className="w-full max-w-[520px] rounded-[28px] border border-black/10 bg-white shadow-2xl">
          <CardContent className="px-10 py-10">
            {/* Title */}
            <div className="text-center">
              <div className="text-5xl font-extrabold tracking-wide text-brand-dark">
                TMS
              </div>
              <div className="mx-auto mt-2 h-[6px] w-[150px] rounded-full bg-brand-dark" />
              <div className="mt-4 text-sm font-medium tracking-[0.18em] text-brand-dark/90">
                TRANSPORT MANAGEMENT SYSTEM
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-md border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Email/username */}
              <div className="relative group">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35 transition-all duration-200 group-focus-within:text-brand-dark group-focus-within:scale-110" />
                <Input
                  id="username"
                  type="text"
                  placeholder="correo electrónico"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={[
                    "h-12 rounded-md border-transparent bg-[#ECECEE] pl-11 pr-4 text-[15px]",
                    "placeholder:text-black/35",
                    "transition-all duration-200",
                    "focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,0,0,0.12)]",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "hover:bg-[#E6E6E8]",
                  ].join(" ")}
                />
              </div>

              {/* Password with eye */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35 transition-all duration-200 group-focus-within:text-brand-dark group-focus-within:scale-110" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={[
                    "h-12 rounded-md border-transparent bg-[#ECECEE] pl-11 pr-12 text-[15px]",
                    "placeholder:text-black/35",
                    "transition-all duration-200",
                    "focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,0,0,0.12)]",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "hover:bg-[#E6E6E8]",
                  ].join(" ")}
                />

                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className={[
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "inline-flex h-9 w-9 items-center justify-center rounded-md",
                    "text-black/45 transition-all duration-200",
                    "hover:bg-black/5 hover:text-black/70",
                    "active:scale-95",
                  ].join(" ")}
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
                <label className="flex cursor-pointer items-center gap-2 text-black/60">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-brand-dark"
                  />
                  Recuérdame
                </label>

                <button
                  type="button"
                  className="text-black/45 transition-colors hover:text-black/70"
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
                <Check className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30 transition-all duration-200 group-focus-within:text-brand-dark group-focus-within:scale-110" />
                <Input
                  id="twoFactor"
                  inputMode="numeric"
                  placeholder="doble verificación"
                  value={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.value)}
                  className={[
                    "h-12 rounded-md border-transparent bg-[#ECECEE] pl-11 pr-4 text-[15px]",
                    "placeholder:text-black/35",
                    "transition-all duration-200",
                    "focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,0,0,0.12)]",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "hover:bg-[#E6E6E8]",
                  ].join(" ")}
                />
              </div>

              {/* Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className={[
                  "mt-2 h-12 w-full rounded-md bg-brand-dark text-base font-semibold text-white",
                  "transition-all duration-200",
                  "hover:bg-brand-dark/90 hover:-translate-y-[1px] hover:shadow-lg",
                  "active:translate-y-0 active:shadow-md",
                  "disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                ].join(" ")}
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

              <div className="pt-3 text-center text-[11px] text-black">
                ¿No tienes acceso? Cominicate con el soporte técnico o con el
                administrador.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
