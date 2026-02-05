import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, ArrowRight } from "lucide-react";
import { BulkUploadDrawer } from "@/features/cargas-masivas/BulkUploadDrawer";
import {
  importTypeConfigs,
  ImportTypeConfig,
  getTemplateColumns,
} from "@/features/cargas-masivas/importTypeConfigs";

const CargasMasivas = () => {
  const [selectedImport, setSelectedImport] = useState<ImportTypeConfig | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCardClick = (importType: ImportTypeConfig) => {
    setSelectedImport(importType);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Cargas Masivas"
        description="Importa datos de forma masiva usando plantillas Excel/CSV"
      />

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">¿Cómo funciona?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                1. Selecciona el tipo de datos a importar → 2. Descarga la
                plantilla → 3. Llénala con tus datos → 4. Súbela y procesa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {importTypeConfigs.map((importType) => {
          const IconComponent = importType.icon;
          const requiredCount = importType.columns.filter(
            (c) => c.required,
          ).length;
          const totalCount = importType.columns.length;

          return (
            <Card
              key={importType.id}
              className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => handleCardClick(importType)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${importType.color}`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {importType.recordCount && (
                      <Badge variant="secondary" className="text-xs">
                        {importType.recordCount} registros
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {requiredCount} obligatorios / {totalCount} campos
                    </span>
                  </div>
                </div>
                <CardTitle className="text-base mt-3 group-hover:text-primary transition-colors">
                  {importType.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {importType.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Upload className="h-3 w-3" />
                    <span>CSV, Excel</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary group-hover:translate-x-1 transition-transform">
                    <span>Importar</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Uploads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cargas Recientes</CardTitle>
          <CardDescription>
            Historial de las últimas importaciones realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: "Casetas",
                user: "Carlos Mendoza",
                date: "2026-01-30 14:30",
                records: 45,
                status: "success",
              },
              {
                type: "Clientes",
                user: "María Rodríguez",
                date: "2026-01-29 11:15",
                records: 23,
                status: "success",
              },
              {
                type: "Operadores",
                user: "Roberto Sánchez",
                date: "2026-01-28 09:45",
                records: 12,
                status: "success",
              },
              {
                type: "Unidades",
                user: "Ana Torres",
                date: "2026-01-27 16:20",
                records: 8,
                status: "success",
              },
            ].map((upload, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-status-success-bg flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-status-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{upload.type}</p>
                    <p className="text-xs text-muted-foreground">
                      por {upload.user} • {upload.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {upload.records} registros
                  </Badge>
                  <Badge className="bg-status-success-bg text-status-success border-status-success-border text-xs">
                    Exitoso
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BulkUploadDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        importType={selectedImport}
      />
    </div>
  );
};

export default CargasMasivas;
