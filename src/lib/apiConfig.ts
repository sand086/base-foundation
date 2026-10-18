// VITE_API_BASE_URL puede ser "/api", "http://host:8000" o "http://host:8000/api".
// API_ORIGIN es siempre el origen sin "/api" (las rutas del backend ya lo incluyen).
const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_ORIGIN: string = raw.replace(/\/+$/, "").replace(/\/api$/, "");
export const API_URL: string = `${API_ORIGIN}/api`;
