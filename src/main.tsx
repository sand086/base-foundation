import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";

// 1. Importas la configuración global
import { OpenAPI } from "./api/generated";

// 2. Lees la URL desde tu archivo .env
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// 3. Configuras el token
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("token") || "";
};

createRoot(document.getElementById("root")!).render(<App />);
