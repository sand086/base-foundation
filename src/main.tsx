import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";

// 1. Importas la configuración global
import { OpenAPI } from "./api/generated";

// 2. Configurar la BASE usando el ENV
// Usamos VITE_API_BASE_URL para que OpenAPI sepa a dónde mandar los JSON
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Logs de seguridad para que veas en la consola si detectó bien tu .env
console.log("🚀 Entorno:", import.meta.env.MODE);
console.log("🔗 API Base:", OpenAPI.BASE);

// 3. Configuras el token como una función asíncrona
// Esto es genial porque OpenAPI lo ejecutará antes de cada petición automática
OpenAPI.TOKEN = async () => {
  const token = localStorage.getItem("access_token"); // Asegúrate que el nombre sea el mismo que en AuthContext
  return token || "";
};

createRoot(document.getElementById("root")!).render(<App />);
