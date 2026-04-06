/**
 * Validation utilities for Bulk Upload Module
 * Validates CSV data against column metadata before sending to backend
 */

import { ColumnMeta, ImportTypeConfig } from "./importTypeConfigs";

export interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validRowCount: number;
  totalRowCount: number;
}

/**
 * Normaliza un encabezado para compararlo (ej: "Número Económico" -> "numero_economico")
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]/g, "_") // Reemplazar no alfanuméricos con guion bajo
    .replace(/_+/g, "_") // Colapsar guiones bajos repetidos
    .replace(/^_|_$/g, ""); // Eliminar guiones al inicio/final
}

/**
 * Validates a single cell value against column metadata
 */
function validateCell(
  value: string,
  column: ColumnMeta,
  rowIndex: number,
): ValidationError | null {
  const trimmedValue = value ? value.trim() : "";

  // Check required fields
  if (column.required && !trimmedValue) {
    return {
      row: rowIndex,
      column: column.name,
      value: trimmedValue,
      message: `Campo obligatorio "${column.name}" está vacío`,
    };
  }

  // Skip further validation if empty and not required
  if (!trimmedValue) return null;

  // Type-specific validations
  switch (column.type) {
    case "number": {
      // Remove commas from currency/numbers (e.g. "1,200.50")
      const cleanValue = trimmedValue.replace(/,/g, "");
      const numValue = parseFloat(cleanValue);
      if (isNaN(numValue)) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser un número válido`,
        };
      }
      break;
    }

    case "date": {
      // Accept formats: YYYY-MM-DD, DD/MM/YYYY
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      ];
      const isValidDate = datePatterns.some((pattern) =>
        pattern.test(trimmedValue),
      );
      // Intentar parsear la fecha
      const parsedDate = new Date(trimmedValue);

      if (!isValidDate && isNaN(parsedDate.getTime())) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser una fecha válida`,
        };
      }
      break;
    }

    case "enum": {
      if (column.enumValues) {
        // Normalizar valor y opciones para comparación flexible
        const val = trimmedValue.toLowerCase().replace(/_/g, " ");
        const options = column.enumValues.map((v) =>
          v.toLowerCase().replace(/_/g, " "),
        );

        // Checar coincidencia exacta, mayúsculas o normalizada
        if (
          !column.enumValues.includes(trimmedValue) &&
          !options.includes(val)
        ) {
          return {
            row: rowIndex,
            column: column.name,
            value: trimmedValue,
            message: `"${column.name}" valor inválido. Opciones: ${column.enumValues.join(", ")}`,
          };
        }
      }
      break;
    }

    case "boolean": {
      const validBooleans = [
        "true",
        "false",
        "1",
        "0",
        "si",
        "no",
        "yes",
        "no",
      ];
      if (!validBooleans.includes(trimmedValue.toLowerCase())) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser SI/NO`,
        };
      }
      break;
    }

    case "string":
    default:
      break;
  }

  // Length validations for strings
  if (column.type === "string" || column.type === "enum") {
    if (column.minLength && trimmedValue.length < column.minLength) {
      return {
        row: rowIndex,
        column: column.name,
        value: trimmedValue,
        message: `"${column.name}" mín. ${column.minLength} caracteres`,
      };
    }
    if (column.maxLength && trimmedValue.length > column.maxLength) {
      return {
        row: rowIndex,
        column: column.name,
        value: trimmedValue,
        message: `"${column.name}" máx. ${column.maxLength} caracteres`,
      };
    }
  }

  // Pattern validation
  if (column.pattern && !column.pattern.test(trimmedValue)) {
    return {
      row: rowIndex,
      column: column.name,
      value: trimmedValue,
      message: column.patternMessage || `"${column.name}" formato inválido`,
    };
  }

  return null;
}

/**
 * Validates all data rows against the import configuration
 */
export function validateImportData(
  data: string[][],
  config: ImportTypeConfig,
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Identificar encabezados (Fila 1)
  const fileHeaders = data[0]?.map((h) => (h ? h.trim() : "")) || [];
  const normalizedFileHeaders = fileHeaders.map((h) => normalizeHeader(h));

  const dataRows = data.slice(1);

  // 2. Mapear columnas del Excel a la Configuración usando normalización
  // Map<IndexEnExcel, ConfigColumn>
  const columnMapping: Map<number, ColumnMeta> = new Map();

  config.columns.forEach((col) => {
    const configNorm = normalizeHeader(col.name);
    // Intentar buscar match exacto o normalizado
    let index = normalizedFileHeaders.indexOf(configNorm);

    // Si no encuentra match normalizado, intentar match simple (toLowerCase)
    if (index === -1) {
      index = fileHeaders.findIndex(
        (h) => h.toLowerCase() === col.name.toLowerCase(),
      );
    }

    if (index !== -1) {
      columnMapping.set(index, col);
    }
  });

  // 3. Verificar columnas obligatorias faltantes
  const missingColumns = config.columns
    .filter((col) => {
      // Si es obligatoria y no está en el mapeo
      if (!col.required) return false;
      const found = Array.from(columnMapping.values()).some(
        (c) => c.name === col.name,
      );
      return !found;
    })
    .map((col) => col.name);

  if (missingColumns.length > 0) {
    errors.push({
      row: 0,
      column: "Encabezados",
      value: "",
      message: `Faltan columnas obligatorias: ${missingColumns.join(", ")}. Verifique los nombres en la primera fila.`,
    });
    // Si faltan columnas obligatorias, detenemos validación detallada para no llenar de errores
    return {
      isValid: false,
      errors,
      validRowCount: 0,
      totalRowCount: dataRows.length,
    };
  }

  // 4. Validar cada fila
  let validRowCount = 0;
  dataRows.forEach((row, rowIndex) => {
    const actualRowNumber = rowIndex + 2; // +1 header, +1 indice 0
    let rowHasErrors = false;

    // A) Validar celdas presentes
    row.forEach((cell, cellIndex) => {
      const columnMeta = columnMapping.get(cellIndex);
      if (columnMeta) {
        const error = validateCell(cell || "", columnMeta, actualRowNumber);
        if (error) {
          errors.push(error);
          rowHasErrors = true;
        }
      }
    });

    // B) Validar celdas vacías/faltantes para columnas mapeadas
    config.columns.forEach((col) => {
      if (col.required) {
        // Encontrar índice de esta columna en el excel
        let colIndex = -1;
        for (const [idx, meta] of columnMapping.entries()) {
          if (meta.name === col.name) {
            colIndex = idx;
            break;
          }
        }

        // Si la celda está vacía o undefined
        if (colIndex !== -1 && (!row[colIndex] || !row[colIndex].trim())) {
          // Evitar duplicar si ya validamos la celda arriba (validateCell maneja vacíos si se le llama)
          // Pero si el row es más corto que los headers, el forEach anterior no corre para esta celda
          const alreadyReported = errors.some(
            (e) => e.row === actualRowNumber && e.column === col.name,
          );
          if (!alreadyReported) {
            errors.push({
              row: actualRowNumber,
              column: col.name,
              value: "",
              message: `Requerido`,
            });
            rowHasErrors = true;
          }
        }
      }
    });

    if (!rowHasErrors) {
      validRowCount++;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validRowCount,
    totalRowCount: dataRows.length,
  };
}

export function getErrorPreview(
  errors: ValidationError[],
  limit: number = 5,
): ValidationError[] {
  return errors.slice(0, limit);
}
