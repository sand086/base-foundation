/**
 * Validation utilities for Bulk Upload Module
 * Validates CSV data against column metadata before sending to backend
 */

import { ColumnMeta, ImportTypeConfig } from './importTypeConfigs';

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
 * Validates a single cell value against column metadata
 */
function validateCell(value: string, column: ColumnMeta, rowIndex: number): ValidationError | null {
  const trimmedValue = value.trim();
  
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
    case 'number': {
      const numValue = parseFloat(trimmedValue);
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

    case 'date': {
      // Accept formats: YYYY-MM-DD, DD/MM/YYYY
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      ];
      const isValidDate = datePatterns.some(pattern => pattern.test(trimmedValue));
      if (!isValidDate) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser una fecha válida (YYYY-MM-DD o DD/MM/YYYY)`,
        };
      }
      // Validate actual date
      const parsedDate = new Date(trimmedValue);
      if (isNaN(parsedDate.getTime())) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" contiene una fecha inválida`,
        };
      }
      break;
    }

    case 'enum': {
      if (column.enumValues && !column.enumValues.includes(trimmedValue.toLowerCase()) && 
          !column.enumValues.includes(trimmedValue.toUpperCase()) &&
          !column.enumValues.includes(trimmedValue)) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser uno de: ${column.enumValues.join(', ')}`,
        };
      }
      break;
    }

    case 'boolean': {
      const validBooleans = ['true', 'false', '1', '0', 'si', 'no', 'yes', 'no'];
      if (!validBooleans.includes(trimmedValue.toLowerCase())) {
        return {
          row: rowIndex,
          column: column.name,
          value: trimmedValue,
          message: `"${column.name}" debe ser verdadero/falso (SI/NO)`,
        };
      }
      break;
    }

    case 'string':
    default:
      // String validations
      break;
  }

  // Length validations for strings
  if (column.type === 'string' || column.type === 'enum') {
    if (column.minLength && trimmedValue.length < column.minLength) {
      return {
        row: rowIndex,
        column: column.name,
        value: trimmedValue,
        message: `"${column.name}" debe tener al menos ${column.minLength} caracteres`,
      };
    }
    if (column.maxLength && trimmedValue.length > column.maxLength) {
      return {
        row: rowIndex,
        column: column.name,
        value: trimmedValue,
        message: `"${column.name}" no debe exceder ${column.maxLength} caracteres`,
      };
    }
  }

  // Pattern validation (e.g., RFC format)
  if (column.pattern && !column.pattern.test(trimmedValue)) {
    return {
      row: rowIndex,
      column: column.name,
      value: trimmedValue,
      message: column.patternMessage || `"${column.name}" tiene un formato inválido`,
    };
  }

  return null;
}

/**
 * Validates all data rows against the import configuration
 */
export function validateImportData(
  data: string[][],
  config: ImportTypeConfig
): ValidationResult {
  const errors: ValidationError[] = [];
  const headers = data[0]?.map(h => h.trim().toLowerCase()) || [];
  const dataRows = data.slice(1);
  
  // Map column indices to column metadata
  const columnMapping: Map<number, ColumnMeta> = new Map();
  config.columns.forEach(col => {
    const index = headers.indexOf(col.name.toLowerCase());
    if (index !== -1) {
      columnMapping.set(index, col);
    }
  });

  // Check for missing required columns
  const missingColumns = config.columns
    .filter(col => col.required && !headers.includes(col.name.toLowerCase()))
    .map(col => col.name);

  if (missingColumns.length > 0) {
    errors.push({
      row: 0,
      column: 'headers',
      value: '',
      message: `Columnas obligatorias faltantes: ${missingColumns.join(', ')}`,
    });
  }

  // Validate each data row
  let validRowCount = 0;
  dataRows.forEach((row, rowIndex) => {
    const actualRowNumber = rowIndex + 2; // +1 for 0-index, +1 for header row
    let rowHasErrors = false;

    row.forEach((cell, cellIndex) => {
      const columnMeta = columnMapping.get(cellIndex);
      if (columnMeta) {
        const error = validateCell(cell, columnMeta, actualRowNumber);
        if (error) {
          errors.push(error);
          rowHasErrors = true;
        }
      }
    });

    // Also check if required columns are present in this row
    config.columns.forEach(col => {
      if (col.required) {
        const colIndex = headers.indexOf(col.name.toLowerCase());
        if (colIndex === -1 || !row[colIndex]?.trim()) {
          const alreadyReported = errors.some(
            e => e.row === actualRowNumber && e.column === col.name
          );
          if (!alreadyReported) {
            errors.push({
              row: actualRowNumber,
              column: col.name,
              value: '',
              message: `Campo obligatorio "${col.name}" está vacío`,
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

/**
 * Groups validation errors by row for display
 */
export function groupErrorsByRow(errors: ValidationError[]): Map<number, ValidationError[]> {
  const grouped = new Map<number, ValidationError[]>();
  errors.forEach(error => {
    const existing = grouped.get(error.row) || [];
    existing.push(error);
    grouped.set(error.row, existing);
  });
  return grouped;
}

/**
 * Gets the first N errors for preview
 */
export function getErrorPreview(errors: ValidationError[], limit: number = 5): ValidationError[] {
  return errors.slice(0, limit);
}
