import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Fuel,
  Plus,
  AlertTriangle,
  Image,
  ImageOff,
  FileText,
  TrendingUp,
  Gauge,
  Droplets,
} from 'lucide-react';
import { mockCargasCombustible, unidadesCombustible, operadoresCombustible, type CargaCombustible, type TipoCombustible } from '@/data/combustibleData';
import { AddTicketModal, type TicketFormData } from '@/features/combustible/AddTicketModal';
import { ViewCargaModal } from '@/features/combustible/ViewCargaModal';
import { EditCargaModal } from '@/features/combustible/EditCargaModal';
import { EnhancedDataTable, ColumnDef } from '@/components/ui/enhanced-data-table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CombustibleCargas = () => {
  const [cargas, setCargas] = useState<CargaCombustible[]>(mockCargasCombustible);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<CargaCombustible | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<CargaCombustible | null>(null);

  // Separate totals for Diesel and Urea
  const dieselCargas = cargas.filter(c => c.tipoCombustible === 'diesel');
  const ureaCargas = cargas.filter(c => c.tipoCombustible === 'urea');
  
  const totalLitrosDiesel = dieselCargas.reduce((sum, c) => sum + c.litros, 0);
  const totalLitrosUrea = ureaCargas.reduce((sum, c) => sum + c.litros, 0);
  const totalMontoDiesel = dieselCargas.reduce((sum, c) => sum + c.total, 0);
  const totalMontoUrea = ureaCargas.reduce((sum, c) => sum + c.total, 0);
  const cargasConAlerta = cargas.filter(c => c.excedeTanque).length;

  const handleAddTicket = (data: TicketFormData) => {
    const unit = unidadesCombustible.find(u => u.id === data.unidadId);
    const operator = operadoresCombustible.find(o => o.id === data.operadorId);
    
    if (!unit || !operator) return;

    const tankCapacity = data.tipoCombustible === 'diesel' 
      ? unit.capacidadTanqueDiesel 
      : unit.capacidadTanqueUrea;

    const newCarga: CargaCombustible = {
      id: `CRG-${Date.now()}`,
      fechaHora: data.fechaHora.replace('T', ' '),
      unidadId: data.unidadId,
      unidadNumero: unit.numero,
      operadorId: data.operadorId,
      operadorNombre: operator.nombre,
      estacion: data.estacion,
      tipoCombustible: data.tipoCombustible,
      litros: data.litros,
      precioPorLitro: data.precioPorLitro,
      total: data.litros * data.precioPorLitro,
      odometro: data.odometro,
      tieneEvidencia: data.evidencia !== null,
      evidenciaUrl: data.evidencia ? URL.createObjectURL(data.evidencia) : undefined,
      capacidadTanque: tankCapacity,
      excedeTanque: data.litros > tankCapacity,
    };

    setCargas(prev => [newCarga, ...prev]);
    toast.success('Ticket registrado', {
      description: `Carga de ${data.litros}L de ${data.tipoCombustible === 'diesel' ? 'Diesel' : 'Urea'} para ${unit.numero} registrada correctamente.`,
    });
  };

  const handleEditCarga = (updatedCarga: CargaCombustible) => {
    setCargas(prev => prev.map(c => c.id === updatedCarga.id ? updatedCarga : c));
  };

  const FuelTypeBadge = ({ type }: { type: TipoCombustible }) => (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-medium transition-all",
        type === 'diesel' 
          ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' 
          : 'bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200'
      )}
    >
      {type === 'diesel' 
        ? <Fuel className="h-3 w-3" /> 
        : <Droplets className="h-3 w-3" />
      }
      {type === 'diesel' ? 'Diesel' : 'Urea'}
    </Badge>
  );

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<CargaCombustible>[] = useMemo(() => [
    {
      key: 'fechaHora',
      header: 'Fecha/Hora',
      type: 'date',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'tipoCombustible',
      header: 'Tipo',
      type: 'status',
      statusOptions: ['diesel', 'urea'],
      render: (value) => <FuelTypeBadge type={value as TipoCombustible} />,
    },
    {
      key: 'unidadNumero',
      header: 'Unidad',
      render: (value) => <Badge variant="outline" className="font-mono">{value}</Badge>,
    },
    {
      key: 'operadorNombre',
      header: 'Operador',
      render: (value) => <span className="text-sm max-w-[150px] truncate">{value}</span>,
    },
    {
      key: 'estacion',
      header: 'Estación',
      render: (value) => <span className="text-sm max-w-[200px] truncate text-muted-foreground">{value}</span>,
    },
    {
      key: 'litros',
      header: 'Litros',
      type: 'number',
      render: (value, row) => (
        <div className="flex items-center justify-end gap-1">
          {row.excedeTanque && <AlertTriangle className="h-4 w-4 text-status-warning" />}
          <span className={row.excedeTanque ? 'text-status-warning font-semibold' : 'font-mono'}>
            {value.toFixed(1)} L
          </span>
        </div>
      ),
    },
    {
      key: 'precioPorLitro',
      header: 'Precio/L',
      type: 'number',
      render: (value) => <span className="font-mono text-sm text-right">${value.toFixed(2)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      type: 'number',
      render: (value) => (
        <span className="font-semibold text-right">
          ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'odometro',
      header: 'Odómetro',
      type: 'number',
      render: (value) => (
        <div className="flex items-center justify-end gap-1 text-muted-foreground">
          <Gauge className="h-3 w-3" />
          <span className="font-mono text-sm">{value.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'tieneEvidencia',
      header: 'Evidencia',
      render: (value) => (
        <div className="flex justify-center">
          {value ? (
            <div className="w-7 h-7 rounded bg-status-success-bg flex items-center justify-center">
              <Image className="h-4 w-4 text-status-success" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      ),
    },
  ], []);

  const handleRowClick = (row: CargaCombustible) => {
    setCargaToView(row);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Bitácora de Cargas" 
        description="Registro de tickets de combustible (Diesel y Urea/DEF)"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cargas</p>
                <p className="text-3xl font-bold">{cargas.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dieselCargas.length} Diesel • {ureaCargas.length} Urea
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Fuel className="h-3 w-3" /> Litros Diesel
                </p>
                <p className="text-3xl font-bold text-amber-600">{totalLitrosDiesel.toLocaleString()}</p>
              </div>
              <Fuel className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${totalMontoDiesel.toLocaleString('es-MX')} MXN
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/10 rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Droplets className="h-3 w-3" /> Litros Urea/DEF
                </p>
                <p className="text-3xl font-bold text-sky-600">{totalLitrosUrea.toLocaleString()}</p>
              </div>
              <Droplets className="h-8 w-8 text-sky-500 opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${totalMontoUrea.toLocaleString('es-MX')} MXN
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">${(totalMontoDiesel + totalMontoUrea).toLocaleString('es-MX')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-status-success opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Alerta</p>
                <p className="text-3xl font-bold text-status-warning">{cargasConAlerta}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-warning opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar with Add Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-9 gap-2 bg-action hover:bg-action-hover text-action-foreground"
        >
          <Plus className="h-4 w-4" />
          Agregar Ticket
        </Button>
      </div>

      {/* Enhanced Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={cargas}
            columns={columns}
            onRowClick={handleRowClick}
            exportFileName="cargas_combustible"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddTicket}
      />

      <ViewCargaModal
        open={!!cargaToView}
        onOpenChange={() => setCargaToView(null)}
        carga={cargaToView}
      />

      <EditCargaModal
        open={!!cargaToEdit}
        onOpenChange={() => setCargaToEdit(null)}
        carga={cargaToEdit}
        onSave={handleEditCarga}
      />
    </div>
  );
};

export default CombustibleCargas;
