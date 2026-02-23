// src/api/axiosClient.ts
import axios from "axios";

// Vite: variables deben empezar con VITE_
const baseURL = import.meta.env.PROD
  ? "/api"
  : import.meta.env.VITE_API_BASE_URL || "/api";

const axiosClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor para inyectar el token en cada petición
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar respuestas (especialmente el 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el backend dice que el token es inválido o expiró, cerramos la sesión en el cliente
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");

      // Solo recargamos la página si no estamos ya en el login, para evitar loops infinitos
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
