import { execSync } from "child_process";

console.log(" GENERANDO CÓDIGO DE LA API...");

try {
  // Ejecuta la generación de código
  execSync(
    "npx openapi-typescript-codegen --input ./openapi.json --output ./src/api/generated --client axios",
    { stdio: "inherit" },
  );
  console.log(
    " [OK] ¡Listo! Código generado exitosamente en src/api/generated",
  );
} catch (error) {
  console.error(
    " [X] Error al generar el código de la API. Revisa tu openapi.json.",
  );
  process.exit(1);
}
