import axios from "axios";

// Vite: variables deben empezar con VITE_
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const axiosClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!String(error.config?.url || "").includes("/auth/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
