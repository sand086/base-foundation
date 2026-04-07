import axios from "axios";

// Base URL desde variables de entorno
let envBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

envBase = envBase.replace(/\/$/, "");
const baseURL = `${envBase}/api`;

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- INTERCEPTOR DE PETICIÓN ---
// Inyecta el Access Token (el de 12 horas) en cada llamada
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- INTERCEPTOR DE RESPUESTA ---
// Maneja la expiración y la renovación automática
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Verificamos si el error es 401 (Unauthorized)
    // y si no es una petición que ya estamos reintentando
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Evitamos bucles infinitos si el error 401 viene del propio login o refresh
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true; // Marcamos que estamos en proceso de reintento
      const refreshToken = localStorage.getItem("refresh_token");

      // 2. Si tenemos un Refresh Token, intentamos pedir un nuevo Access Token
      if (refreshToken) {
        try {
          // Llamada directa a axios para evitar usar el interceptor de nuevo aquí
          const { data } = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          // 3. Si el backend nos da el nuevo token
          const newAccessToken = data.access_token;
          localStorage.setItem("access_token", newAccessToken);

          // Actualizamos la cabecera de la petición original y la reintentamos
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest);
        } catch (refreshError) {
          // Si el refresh falla, significa que el token de 7 días también expiró
          console.error("La sesión de larga duración (7 días) ha expirado.");
        }
      }

      // 4. Si llegamos aquí: no había refresh token o el refresh falló
      // Limpiamos todo y sacamos al usuario
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?session=expired";
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
