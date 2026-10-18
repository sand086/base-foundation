import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // VITE_PROXY_TARGET (docker: http://backend:8000) tiene prioridad; si no, se deriva de VITE_API_BASE_URL.
  const backendUrl =
    env.VITE_PROXY_TARGET ||
    (env.VITE_API_BASE_URL && /^https?:\/\//.test(env.VITE_API_BASE_URL)
      ? env.VITE_API_BASE_URL.replace("/api", "")
      : "http://localhost:8000");

  return {
    server: {
      host: "::",
      port: 8080,
      //  ESTO ES VITAL PARA VER LAS FOTOS EN LOCALHOST
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        "/static": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      svgr(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
