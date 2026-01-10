import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Landmark,
  Users,
  Package,
  Truck,
  MapPin,
  FileSpreadsheet,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { BulkUploadDrawer } from '@/features/cargas-masivas/BulkUploadDrawer';

interface ImportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  templateColumns: string[];
  sampleData: string[][];
  recordCount?: number;
}

const importTypes: ImportType[] = [
  {
    id: 'casetas',
    title: 'Importar Casetas',
    description: 'Catálogo de casetas de peaje con costos por tipo de vehículo',
    icon: Landmark,
    color: 'text-status-info',
    templateColumns: ['nombre', 'autopista', 'km', 'costo_2_ejes', 'costo_3_ejes', 'costo_5_ejes', 'acepta_tag'],
    sampleData: [
      ['Caseta Cuautitlán', 'México-Querétaro', '25', '98', '145', '220', 'SI'],
      ['Caseta Palmillas', 'México-Querétaro', '85', '156', '210', '340', 'SI'],
      ['Caseta La Venta', 'Autopista del Sol', '12', '45', '68', '102', 'NO'],
    ],
    recordCount: 245,
  },
  {
    id: 'clientes',
    title: 'Importar Clientes',
    description: 'Datos de clientes y sub-clientes con información fiscal',
    icon: Users,
    color: 'text-primary',
    templateColumns: ['razon_social', 'rfc', 'contacto', 'telefono', 'email', 'direccion', 'regimen_fiscal'],
    sampleData: [
      ['Corporativo Alfa S.A.', 'CAL021001AA1', 'María García', '55 1234 5678', 'contacto@alfa.com', 'Av. Reforma 123', '601'],
      ['Logística Beta', 'LBE990215BB2', 'Roberto López', '33 9876 5432', 'info@beta.mx', 'Calle Norte 456', '601'],
      ['Distribuidora Gamma', 'DGA110701CC3', 'Ana Martínez', '81 5555 4444', 'ventas@gamma.com', 'Blvd. Sur 789', '603'],
    ],
    recordCount: 128,
  },
  {
    id: 'refacciones',
    title: 'Catálogo de Refacciones',
    description: 'Inventario de refacciones y partes para mantenimiento',
    icon: Package,
    color: 'text-status-warning',
    templateColumns: ['codigo', 'descripcion', 'marca', 'categoria', 'unidad', 'precio', 'stock_minimo'],
    sampleData: [
      ['REF-001', 'Filtro de aceite', 'Bosch', 'Motor', 'PZA', '450.00', '10'],
      ['REF-002', 'Balata delantera', 'Brembo', 'Frenos', 'JGO', '1200.00', '5'],
      ['REF-003', 'Llanta 295/80 R22.5', 'Michelin', 'Llantas', 'PZA', '8500.00', '8'],
    ],
    recordCount: 892,
  },
  {
    id: 'unidades',
    title: 'Importar Unidades',
    description: 'Flota de tractocamiones y remolques con datos técnicos',
    icon: Truck,
    color: 'text-status-success',
    templateColumns: ['numero_economico', 'placas', 'vin', 'marca', 'modelo', 'year', 'tipo', 'capacidad_tanque'],
    sampleData: [
      ['TR-204', 'AAA-000-A', '1HGBH41JXMN109186', 'Freightliner', 'Cascadia', '2022', 'Tractocamión', '800'],
      ['TR-118', 'BBB-111-B', '2FMDK3GC4ABA12345', 'Kenworth', 'T680', '2021', 'Tractocamión', '600'],
      ['RM-050', 'CCC-222-C', '3C6TRVDG5FE123456', 'Utility', '3000R', '2023', 'Remolque', '0'],
    ],
    recordCount: 45,
  },
  {
    id: 'rutas',
    title: 'Importar Rutas',
    description: 'Rutas predefinidas con orígenes, destinos y tarifas base',
    icon: MapPin,
    color: 'text-status-danger',
    templateColumns: ['nombre_ruta', 'origen', 'destino', 'km_aprox', 'tiempo_hrs', 'tarifa_base', 'casetas_incluidas'],
    sampleData: [
      ['Norte Express', 'CDMX', 'Monterrey', '920', '10', '45000', 'Cuautitlán,Palmillas,Saltillo'],
      ['Bajío Central', 'Guadalajara', 'Querétaro', '280', '3', '15000', 'Zapotlanejo,La Piedad'],
      ['Costa Pacífico', 'Manzanillo', 'CDMX', '850', '9', '42000', 'Colima,Atlacomulco'],
    ],
    recordCount: 67,
  },
];

const CargasMasivas = () => {
  const [selectedImport, setSelectedImport] = useState<ImportType | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCardClick = (importType: ImportType) => {
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
                1. Selecciona el tipo de datos a importar → 2. Descarga la plantilla → 3. Llénala con tus datos → 4. Súbela y procesa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {importTypes.map((importType) => {
          const IconComponent = importType.icon;
          return (
            <Card 
              key={importType.id}
              className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => handleCardClick(importType)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${importType.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  {importType.recordCount && (
                    <Badge variant="secondary" className="text-xs">
                      {importType.recordCount} registros
                    </Badge>
                  )}
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
          <CardDescription>Historial de las últimas importaciones realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'Casetas', user: 'Carlos Mendoza', date: '2026-01-09 14:30', records: 45, status: 'success' },
              { type: 'Clientes', user: 'María Rodríguez', date: '2026-01-08 11:15', records: 23, status: 'success' },
              { type: 'Refacciones', user: 'Roberto Sánchez', date: '2026-01-07 09:45', records: 156, status: 'success' },
            ].map((upload, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
