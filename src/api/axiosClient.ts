import axios from "axios";
import { toast } from "sonner";

// Base URL desde variables de entorno
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================================================
// --- INTERCEPTOR DE PETICIÓN ---
// =========================================================
// Inyecta el Access Token (el de 12 horas) en cada llamada
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && token !== "null" && token !== "undefined" && config.headers) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// =========================================================
// --- INTERCEPTOR DE RESPUESTA ---
// =========================================================
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // -----------------------------------------------------
    // FASE 1: MANEJO DE TOKENS Y REFRESH (401 Unauthorized)
    // -----------------------------------------------------
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Evitamos bucles infinitos si el error 401 viene del propio login o refresh
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        // Dejamos que pase a la FASE 2 (mostrará el toast de "Credenciales inválidas")
      } else {
        originalRequest._retry = true; // Marcamos que estamos en proceso de reintento
        const refreshToken = localStorage.getItem("refresh_token");

        // Si tenemos un Refresh Token, intentamos pedir un nuevo Access Token
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${baseURL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const newAccessToken = data.access_token;
            localStorage.setItem("access_token", newAccessToken);

            // Actualizamos la cabecera de la petición original y la reintentamos
            originalRequest.headers.set(
              "Authorization",
              `Bearer ${newAccessToken}`,
            );
            return axiosClient(originalRequest);
          } catch (refreshError) {
            console.error("La sesión de larga duración ha expirado.");
          }
        }

        const is2FAEndpoint =
          originalRequest.url?.includes("/auth/verify-2fa") ||
          originalRequest.url?.includes("/auth/request-emergency-code");

        // Si es un endpoint de 2FA, pasamos el error para que la UI lo maneje
        if (!is2FAEndpoint) {
          // Limpiamos todo y sacamos al usuario
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_data");

          const currentPath = window.location.pathname;
          const isPublicPage =
            currentPath.includes("/login") ||
            currentPath.includes("/verify-2fa");

          if (!isPublicPage) {
            window.location.href = "/login?session=expired";
          }

          toast.error("Sesión expirada", {
            description: "Por favor, inicia sesión nuevamente.",
          });
          return Promise.reject(error);
        }
      }
    }

    // -----------------------------------------------------
    // FASE 2: MANEJO GLOBAL DE ERRORES VISUALES (TOASTS)
    // -----------------------------------------------------
    if (error.response) {
      const data = error.response.data;

      // FastAPI envía los errores en la llave "detail"
      if (data && data.detail) {
        // Caso A: Errores de Validación (FastAPI 422 - Unprocessable Entity)
        // Ocurre si mandas mal un formato o te falta un campo obligatorio
        if (Array.isArray(data.detail)) {
          const mensajes = data.detail.map((err: any) => err.msg).join(", ");
          toast.error("Error de validación", { description: mensajes });
        }

        // Caso B: Errores controlados por ti (Ej: "No se puede eliminar: hay usuarios usando este rol")
        else if (typeof data.detail === "string") {
          toast.error("Operación rechazada", { description: data.detail });
        }
      }
      // Por si en algún otro endpoint devuelves "message" en lugar de "detail"
      else if (data && data.message) {
        toast.error("Error", { description: data.message });
      }
      // Error genérico del servidor (500)
      else if (error.response.status >= 500) {
        toast.error("Error del servidor", {
          description: "Ocurrió un error inesperado al procesar la solicitud.",
        });
      }
    } else if (error.request) {
      // La petición salió, pero el backend nunca respondió (Servidor caído o sin internet)
      toast.error("Sin conexión", {
        description: "No se pudo conectar con el servidor. Revisa tu red.",
      });
    } else {
      // Error interno de React al intentar armar la petición
      toast.error("Error de aplicación", { description: error.message });
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
