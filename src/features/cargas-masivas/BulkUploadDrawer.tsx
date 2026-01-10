import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkUploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: {
    id: string;
    title: string;
    description: string;
    templateColumns: string[];
    sampleData: string[][];
  } | null;
}

type UploadStep = 'download' | 'upload' | 'preview' | 'processing' | 'complete';

export function BulkUploadDrawer({ open, onOpenChange, importType }: BulkUploadDrawerProps) {
  const [step, setStep] = useState<UploadStep>('download');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDownloadTemplate = () => {
    if (!importType) return;
    
    // Create CSV content
    const headers = importType.templateColumns.join(',');
    const sampleRows = importType.sampleData.map(row => row.join(',')).join('\n');
    const csvContent = `${headers}\n${sampleRows}`;
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${importType.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Plantilla descargada', {
      description: 'Llena la plantilla y súbela en el siguiente paso.',
    });
    setStep('upload');
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
      toast.error('Formato inválido', {
        description: 'Por favor sube un archivo CSV o Excel.',
      });
      return;
    }

    setFile(selectedFile);

    // Simulate parsing CSV (in real app, use a library like papaparse)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 6); // Header + 5 rows
      const data = lines.map(line => line.split(',').map(cell => cell.trim()));
      setPreviewData(data);
      setStep('preview');
    };
    reader.readAsText(selectedFile);
  };

  const handleProcessUpload = () => {
    setStep('processing');
    
    // Simulate processing
    setTimeout(() => {
      setStep('complete');
      toast.success('Carga procesada exitosamente', {
        description: `${previewData.length - 1} registros importados correctamente.`,
      });
    }, 2000);
  };

  const handleClose = () => {
    setStep('download');
    setFile(null);
    setPreviewData([]);
    onOpenChange(false);
  };

  const getStepNumber = (s: UploadStep): number => {
    const steps: UploadStep[] = ['download', 'upload', 'preview', 'processing', 'complete'];
    return steps.indexOf(s) + 1;
  };

  const isStepComplete = (s: UploadStep): boolean => {
    return getStepNumber(s) < getStepNumber(step);
  };

  if (!importType) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            {importType.title}
          </SheetTitle>
          <SheetDescription>
            {importType.description}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between px-4">
            {['Plantilla', 'Subir', 'Validar', 'Completar'].map((label, index) => {
              const stepMap: UploadStep[] = ['download', 'upload', 'preview', 'complete'];
              const isActive = getStepNumber(step) === index + 1;
              const isComplete = getStepNumber(step) > index + 1;
              
              return (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      isComplete ? "bg-status-success text-white" :
                      isActive ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isActive ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step 1: Download Template */}
          {step === 'download' && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Paso 1: Descarga la plantilla</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Descarga la plantilla, llénala con tus datos y luego súbela aquí.
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

              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Columnas esperadas:</h4>
                <div className="flex flex-wrap gap-2">
                  {importType.templateColumns.map((col, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragOver 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
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
                <label htmlFor="bulk-upload-file" className="cursor-pointer block">
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
                onClick={() => setStep('download')}
                className="w-full"
              >
                Volver a descargar plantilla
              </Button>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {step === 'preview' && (
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
                    setStep('upload');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium">Vista previa (primeros 5 registros)</h4>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        {previewData[0]?.map((header, i) => (
                          <TableHead key={i} className="text-xs font-semibold whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-sm whitespace-nowrap">
                              {cell || <span className="text-muted-foreground italic">vacío</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-status-success-bg border border-status-success-border rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-status-success">Archivo válido</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se detectaron {previewData.length - 1} registros listos para importar.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('upload')}
                  className="flex-1"
                >
                  Cambiar archivo
                </Button>
                <Button 
                  onClick={handleProcessUpload}
                  className="flex-1 bg-action hover:bg-action-hover text-action-foreground gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Procesar Carga
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <div>
                <h3 className="font-semibold text-foreground">Procesando carga...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Esto puede tomar unos segundos.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-status-success-bg flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-status-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">¡Carga completada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewData.length - 1} registros fueron importados exitosamente.
                </p>
              </div>
              <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
