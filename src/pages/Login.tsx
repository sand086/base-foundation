import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logos_3t } from "@/assets/img";
import { AxiosError } from "axios";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const loginSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
  remember: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  //  REACT HOOK FORM
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  // =====================
  // SUBMIT (Llamada a API)
  // =====================
  const onSubmit = async (data: LoginFormData) => {
    setApiError("");

    try {
      // 1. Llamada al Backend a través del Servicio
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      // 2. Caso: El backend dice que el usuario tiene 2FA activado
      if (response.require_2fa) {
        toast({
          title: "Verificación requerida",
          description: "Ingresa el código de tu autenticador",
        });

        navigate("/verify-2fa", {
          replace: true,
          state: {
            tempToken: response.temp_token,
            user: response.user,
          },
        });
        return;
      }

      // 3. Si el login es directo (y tenemos token + user + refresh_token)
      //  CORRECCIÓN: Validamos y pasamos el refresh_token exigido por el AuthContext
      if (response.access_token && response.user && response.refresh_token) {
        // Guardamos en el estado global (Contexto) y en localStorage
        login(response.user, response.access_token, response.refresh_token);

        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente",
        });

        // Redirigimos al Dashboard
        navigate("/", { replace: true });
      } else if (
        response.access_token &&
        response.user &&
        !response.refresh_token
      ) {
        // Fallback de seguridad por si el backend no manda refresh token en algún entorno
        setApiError("Respuesta del servidor incompleta (Falta Refresh Token).");
      }
    } catch (err) {
      console.error("Error en login:", err);

      if (err instanceof AxiosError) {
        const status = err.response?.status;

        if (status === 401) {
          setApiError("Usuario o contraseña incorrectos");
        } else if (status === 403) {
          setApiError(
            "Tu usuario está desactivado. Contacta al administrador.",
          );
        } else if (status === 422) {
          setApiError("Formato de correo o contraseña inválido");
        } else {
          setApiError(`Error del servidor: ${status}`);
        }
      } else {
        setApiError("Ocurrió un error inesperado. Verifica tu conexión.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Background image & overlays */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-[subtle-float_20s_ease-in-out_infinite]"
          style={{
            backgroundImage: `url(${logos_3t?.login_bg_3t || "/assets/img/login-bg.jpg"})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-red/20 via-transparent to-transparent" />
      </div>

      {/* Logo top-right */}
      <div className="hidden md:block absolute right-16 top-10 z-10 select-none">
        <img
          src={logos_3t?.logo_white_3t || "/assets/img/logo-white.svg"}
          alt="TMS Logo"
          className="h-20 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-6 md:justify-end md:px-16">
        <Card className="login-card w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_8px_64px_rgba(0,0,0,0.5)]">
          <CardContent className="px-10 py-10">
            {/* Title */}
            <div className="text-center">
              <div className="text-5xl font-black uppercase tracking-wide text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                TMS
              </div>
              <div className="mx-auto mt-2 h-[6px] w-[150px] rounded-full bg-gradient-to-r from-brand-red via-brand-red/80 to-brand-red shadow-[0_0_20px_rgba(190,8,17,0.5)]" />
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                TRANSPORT MANAGEMENT SYSTEM
              </div>
            </div>

            {/* Error Message (API) */}
            {apiError && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-sm p-4 animate-in fade-in slide-in-from-top-2 shadow-inner">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <span className="text-xs font-bold text-rose-200">
                  {apiError}
                </span>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-8 space-y-5"
              >
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40 transition-all duration-300 group-focus-within:text-white group-focus-within:scale-110" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Correo Electrónico"
                            autoComplete="username"
                            className="h-14 rounded-xl border border-white/20 bg-white/5 pl-12 pr-4 text-base font-medium text-white placeholder:text-white/30 transition-all duration-300 focus:bg-white/10 focus:border-white/40 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/10 hover:border-white/30"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-rose-400" />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40 transition-all duration-300 group-focus-within:text-white group-focus-within:scale-110" />
                          <Input
                            {...field}
                            type={showPass ? "text" : "password"}
                            placeholder="Contraseña"
                            autoComplete="current-password"
                            className="h-14 rounded-xl border border-white/20 bg-white/5 pl-12 pr-12 text-base font-medium text-white placeholder:text-white/30 transition-all duration-300 focus:bg-white/10 focus:border-white/40 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/10 hover:border-white/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
                          >
                            {showPass ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-rose-400" />
                    </FormItem>
                  )}
                />

                {/* Extras */}
                <div className="flex items-center justify-between pt-2">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white/90 transition-colors">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-white/30 bg-white/10 accent-brand-red cursor-pointer"
                        />
                        Recuérdame
                      </label>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 h-14 w-full rounded-xl bg-brand-red text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-red-700 hover:-translate-y-[2px] hover:shadow-[0_0_30px_rgba(190,8,17,0.5)] active:translate-y-0 active:shadow-[0_0_15px_rgba(190,8,17,0.3)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none border-0 haptic-press"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      AUTENTICANDO...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      INICIAR SESIÓN <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>

                <div className="pt-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Soporte Técnico:{" "}
                  <span className="text-white/70 tracking-normal normal-case">
                    admin@transportes.com
                  </span>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
