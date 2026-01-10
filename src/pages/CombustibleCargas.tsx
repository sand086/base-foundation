import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Fuel,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Image,
  ImageOff,
  FileText,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import { mockCargasCombustible, unidadesCombustible, operadoresCombustible, type CargaCombustible } from '@/data/combustibleData';
import { AddTicketModal, type TicketFormData } from '@/features/combustible/AddTicketModal';
import { toast } from 'sonner';

const CombustibleCargas = () => {
  const [cargas, setCargas] = useState<CargaCombustible[]>(mockCargasCombustible);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCargas = cargas.filter(
    (carga) =>
      carga.unidadNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.operadorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.estacion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0);
  const totalMonto = cargas.reduce((sum, c) => sum + c.total, 0);
  const cargasConAlerta = cargas.filter(c => c.excedeTanque).length;

  const handleAddTicket = (data: TicketFormData) => {
    const unit = unidadesCombustible.find(u => u.id === data.unidadId);
    const operator = operadoresCombustible.find(o => o.id === data.operadorId);
    
    if (!unit || !operator) return;

    const newCarga: CargaCombustible = {
      id: `CRG-${Date.now()}`,
      fechaHora: data.fechaHora.replace('T', ' '),
      unidadId: data.unidadId,
      unidadNumero: unit.numero,
      operadorId: data.operadorId,
      operadorNombre: operator.nombre,
      estacion: data.estacion,
      litros: data.litros,
      precioPorLitro: data.precioPorLitro,
      total: data.litros * data.precioPorLitro,
      odometro: data.odometro,
      tieneEvidencia: data.evidencia !== null,
      evidenciaUrl: data.evidencia ? URL.createObjectURL(data.evidencia) : undefined,
      capacidadTanque: unit.capacidadTanque,
      excedeTanque: data.litros > unit.capacidadTanque,
    };

    setCargas(prev => [newCarga, ...prev]);
    toast.success('Ticket registrado', {
      description: `Carga de ${data.litros}L para ${unit.numero} registrada correctamente.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Bitácora de Cargas" 
        description="Registro de tickets de combustible"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cargas</p>
                <p className="text-3xl font-bold">{cargas.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-info">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Litros Totales</p>
                <p className="text-3xl font-bold">{totalLitros.toLocaleString()}</p>
              </div>
              <Fuel className="h-8 w-8 text-status-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">${totalMonto.toLocaleString('es-MX')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-status-success" />
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
              <AlertTriangle className="h-8 w-8 text-status-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidad, operador o estación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
            
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-9 gap-2 bg-action hover:bg-action-hover text-action-foreground w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Agregar Ticket
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Registro de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold">Fecha/Hora</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Unidad</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Operador</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Estación</TableHead>
                  <TableHead className="text-primary-foreground font-semibold text-right">Litros</TableHead>
                  <TableHead className="text-primary-foreground font-semibold text-right">Precio/L</TableHead>
                  <TableHead className="text-primary-foreground font-semibold text-right">Total</TableHead>
                  <TableHead className="text-primary-foreground font-semibold text-right">Odómetro</TableHead>
                  <TableHead className="text-primary-foreground font-semibold text-center">Evidencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCargas.map((carga) => (
                  <TableRow 
                    key={carga.id} 
                    className={carga.excedeTanque ? 'bg-status-warning-bg hover:bg-status-warning-bg/80' : 'hover:bg-muted/50'}
                  >
                    <TableCell className="font-mono text-sm">{carga.fechaHora}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {carga.unidadNumero}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {carga.operadorNombre}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">
                      {carga.estacion}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="flex items-center justify-end gap-1">
                        {carga.excedeTanque && (
                          <AlertTriangle className="h-4 w-4 text-status-warning" />
                        )}
                        <span className={carga.excedeTanque ? 'text-status-warning font-semibold' : ''}>
                          {carga.litros.toFixed(1)} L
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${carga.precioPorLitro.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${carga.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        <span className="font-mono text-sm">{carga.odometro.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {carga.tieneEvidencia ? (
                        <div className="flex justify-center">
                          <div className="w-7 h-7 rounded bg-status-success-bg flex items-center justify-center">
                            <Image className="h-4 w-4 text-status-success" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-4 border-t">
            <span>Mostrando {filteredCargas.length} de {cargas.length} registros</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-status-warning-bg border border-status-warning"></div>
                <span>Excede capacidad del tanque</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddTicket}
      />
    </div>
  );
};

export default CombustibleCargas;
