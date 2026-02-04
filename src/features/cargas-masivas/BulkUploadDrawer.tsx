import { useState } from "react";
import { AxiosError } from "axios";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportTypeConfig, getTemplateColumns } from "./importTypeConfigs";
import {
  validateImportData,
  ValidationResult,
  getErrorPreview,
} from "./validationUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import axiosClient from "@/api/axiosClient";
interface BulkUploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportTypeConfig | null;
}

type UploadStep = "download" | "upload" | "preview" | "processing" | "complete";

export function BulkUploadDrawer({
  open,
  onOpenChange,
  importType,
}: BulkUploadDrawerProps) {
  const [step, setStep] = useState<UploadStep>("download");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  const handleDownloadTemplate = () => {
    if (!importType) return;

    // Create CSV content with proper columns from config
    const columns = getTemplateColumns(importType);
    const headers = columns.join(",");
    const sampleRows = importType.sampleData
      .map((row) => row.join(","))
      .join("\n");
    const csvContent = `${headers}\n${sampleRows}`;

    // Download file
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8",
    }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla_${importType.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Plantilla descargada", {
      description: "Llena la plantilla y súbela en el siguiente paso.",
    });
    setStep("upload");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error("Formato inválido", {
        description: "Por favor sube un archivo CSV o Excel.",
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const data = lines.map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^["']|["']$/g, "")),
      );
      setPreviewData(data);

      // Validate data if we have a config
      if (importType && data.length > 1) {
        const result = validateImportData(data, importType);
        setValidationResult(result);
      }

      setStep("preview");
    };
    reader.readAsText(selectedFile);
  };

  const handleProcessUpload = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setStep("processing");

    // Creamos el FormData para enviar el archivo real
    const formData = new FormData();
    formData.append("file", file);

    try {
      // IMPORTANTE: El backendEndpoint ahora debe ser el que acepta archivos
      await axiosClient.post(
        `${importType.backendEndpoint}/bulk-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setStep("complete");
      toast.success("Archivo guardado y procesado correctamente");
    } catch (error: unknown) {
      setStep("preview");
      const axiosError = error as AxiosError<{ detail: string }>;
      const errorMsg =
        axiosError.response?.data?.detail ||
        "Error al conectar con el servidor";
      toast.error("Error en la carga", { description: errorMsg });
    }
  };

  const handleClose = () => {
    setStep("download");
    setFile(null);
    setPreviewData([]);
    setValidationResult(null);
    onOpenChange(false);
  };

  const getStepNumber = (s: UploadStep): number => {
    const steps: UploadStep[] = [
      "download",
      "upload",
      "preview",
      "processing",
      "complete",
    ];
    return steps.indexOf(s) + 1;
  };

  if (!importType) return null;

  const templateColumns = getTemplateColumns(importType);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-2xl w-full overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            {importType.title}
          </SheetTitle>
          <SheetDescription>{importType.description}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 py-6">
          <div className="space-y-6 pr-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-between px-4">
              {["Plantilla", "Subir", "Validar", "Completar"].map(
                (label, index) => {
                  const isActive = getStepNumber(step) === index + 1;
                  const isComplete = getStepNumber(step) > index + 1;

                  return (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                          isComplete
                            ? "bg-status-success text-white"
                            : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-primary font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  );
                },
              )}
            </div>

            {/* Step 1: Download Template */}
            {step === "download" && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Paso 1: Descarga la plantilla
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Descarga la plantilla, llénala con tus datos y luego
                      súbela aquí.
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadTemplate}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Plantilla (CSV)
                  </Button>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium">
                    Columnas de la plantilla:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {importType.columns.map((col, i) => (
                      <Badge
                        key={i}
                        variant={col.required ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          col.required && "bg-primary/90",
                        )}
                      >
                        {col.name}
                        {col.required && (
                          <span className="ml-1 text-[10px]">*</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary">*</span> = Campo obligatorio
                  </p>
                </div>

                {/* Column Type Reference */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium">
                    Referencia de formatos:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {importType.columns
                      .filter((c) => c.type === "enum")
                      .map((col, i) => (
                        <div key={i} className="bg-muted/30 rounded p-2">
                          <span className="font-medium text-foreground">
                            {col.name}:
                          </span>
                          <br />
                          {col.enumValues?.join(", ")}
                        </div>
                      ))}
                    {importType.columns.filter((c) => c.type === "date")
                      .length > 0 && (
                      <div className="bg-muted/30 rounded p-2">
                        <span className="font-medium text-foreground">
                          Fechas:
                        </span>
                        <br />
                        YYYY-MM-DD (ej: 2026-06-15)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Upload File */}
            {step === "upload" && (
              <div className="space-y-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    id="bulk-upload-file"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="bulk-upload-file"
                    className="cursor-pointer block"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Arrastra tu archivo aquí
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceptados: CSV, XLS, XLSX
                    </p>
                  </label>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setStep("download")}
                  className="w-full"
                >
                  Volver a descargar plantilla
                </Button>
              </div>
            )}

            {/* Step 3: Preview Data with Validation */}
            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file?.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setFile(null);
                      setPreviewData([]);
                      setValidationResult(null);
                      setStep("upload");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Validation Status */}
                {validationResult && (
                  <div
                    className={cn(
                      "rounded-lg p-4 flex items-start gap-3",
                      validationResult.isValid
                        ? "bg-status-success-bg border border-status-success-border"
                        : "bg-status-danger-bg border border-status-danger-border",
                    )}
                  >
                    {validationResult.isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-status-danger shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          validationResult.isValid
                            ? "text-status-success"
                            : "text-status-danger",
                        )}
                      >
                        {validationResult.isValid
                          ? "Archivo válido"
                          : `${validationResult.errors.length} error(es) encontrado(s)`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {validationResult.validRowCount} de{" "}
                        {validationResult.totalRowCount} registros válidos.
                      </p>

                      {/* Show first errors */}
                      {!validationResult.isValid && (
                        <div className="mt-3 space-y-1">
                          {getErrorPreview(validationResult.errors).map(
                            (error, i) => (
                              <div
                                key={i}
                                className="text-xs flex items-start gap-2 text-status-danger"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                <span>
                                  Fila {error.row}: {error.message}
                                </span>
                              </div>
                            ),
                          )}
                          {validationResult.errors.length > 5 && (
                            <p className="text-xs text-muted-foreground italic">
                              ... y {validationResult.errors.length - 5} errores
                              más
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Data Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium">
                      Vista previa (primeros 5 registros)
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary/5">
                          {previewData[0]?.map((header, i) => (
                            <TableHead
                              key={i}
                              className="text-xs font-semibold whitespace-nowrap"
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(1, 6).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className="text-sm whitespace-nowrap"
                              >
                                {cell || (
                                  <span className="text-muted-foreground italic">
                                    vacío
                                  </span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("upload")}
                    className="flex-1"
                  >
                    Cambiar archivo
                  </Button>
                  <Button
                    onClick={handleProcessUpload}
                    disabled={validationResult && !validationResult.isValid}
                    className={cn(
                      "flex-1 gap-2",
                      validationResult?.isValid
                        ? "bg-action hover:bg-action-hover text-action-foreground"
                        : "",
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Procesar Carga
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Processing */}
            {step === "processing" && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    Procesando carga...
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviando{" "}
                    {validationResult?.validRowCount || previewData.length - 1}{" "}
                    registros al servidor.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {step === "complete" && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-status-success-bg flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-status-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    ¡Carga completada!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {validationResult?.validRowCount || previewData.length - 1}{" "}
                    registros fueron importados exitosamente.
                  </p>
                </div>
                <Button
                  onClick={handleClose}
                  className="bg-primary hover:bg-primary/90"
                >
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
