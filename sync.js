import { execSync } from "child_process";
import fs from "fs";
import http from "http";
import https from "https";
import dotenv from "dotenv";

// 1. Cargar las variables del archivo .env
dotenv.config();

console.log("PASO 1: Descargando contrato OpenAPI del backend...");

// 2. Leer la URL del .env o usar localhost como respaldo por si falla
const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const OPENAPI_URL = `${API_BASE_URL}/openapi.json`;

console.log(`Intentando descargar desde: ${OPENAPI_URL}`);

const file = fs.createWriteStream("openapi.json");

// 3. Detectar dinámicamente si es http o https
const client = OPENAPI_URL.startsWith("https") ? https : http;

client
  .get(OPENAPI_URL, (response) => {
    if (response.statusCode !== 200) {
      console.error(
        `[X] Error al descargar openapi.json. Status HTTP: ${response.statusCode}`,
      );
      process.exit(1);
    }

    response.pipe(file);

    file.on("finish", () => {
      file.close();
      console.log("openapi.json descargado correctamente.");
      console.log("PASO 2: Generando código TypeScript...");

      try {
        execSync(
          "npx openapi-typescript-codegen --input ./openapi.json --output ./src/api/generated --client axios",
          { stdio: "inherit" },
        );
        console.log(
          "[OK] ¡Listo! Código generado exitosamente en src/api/generated",
        );
      } catch (error) {
        console.error(" [X] Error al ejecutar openapi-typescript-codegen.");
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error(
      " [X] Error de red. ¿Seguro que el backend de Python está corriendo?",
    );
    console.error("Detalle:", err.message);
    process.exit(1);
  });
