import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Droplets,
} from 'lucide-react';
import { mockCargasCombustible, unidadesCombustible, operadoresCombustible, type CargaCombustible, type TipoCombustible } from '@/data/combustibleData';
import { AddTicketModal, type TicketFormData } from '@/features/combustible/AddTicketModal';
import { ViewCargaModal } from '@/features/combustible/ViewCargaModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CombustibleCargas = () => {
  const [cargas, setCargas] = useState<CargaCombustible[]>(mockCargasCombustible);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<CargaCombustible | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<'all' | TipoCombustible>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredCargas = cargas.filter((carga) => {
    const matchesSearch = 
      carga.unidadNumero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.operadorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.estacion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFuelType = fuelTypeFilter === 'all' || carga.tipoCombustible === fuelTypeFilter;
    
    return matchesSearch && matchesFuelType;
  });

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Bitácora de Cargas" 
        description="Registro de tickets de combustible (Diesel y Urea/DEF)"
      />

      {/* Summary Cards - Now with separate Diesel and Urea */}
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

        {/* Diesel Stats */}
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

        {/* Urea Stats */}
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

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 w-full sm:max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidad, operador o estación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select 
                value={fuelTypeFilter} 
                onValueChange={(v) => setFuelTypeFilter(v as 'all' | TipoCombustible)}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="diesel">
                    <span className="flex items-center gap-2">
                      <Fuel className="h-3 w-3 text-amber-600" /> Diesel
                    </span>
                  </SelectItem>
                  <SelectItem value="urea">
                    <span className="flex items-center gap-2">
                      <Droplets className="h-3 w-3 text-sky-600" /> Urea/DEF
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead className="text-primary-foreground font-semibold">Tipo</TableHead>
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
                {isLoading ? (
                  // Skeleton loading rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                      <TableCell><div className="h-6 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-6 bg-muted rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-40" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16 ml-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16 ml-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 ml-auto" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20 ml-auto" /></TableCell>
                      <TableCell><div className="h-7 w-7 bg-muted rounded mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCargas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros con los criterios de búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCargas.map((carga, index) => (
                    <TableRow 
                      key={carga.id} 
                      className={cn(
                        "transition-all duration-200 hover:shadow-sm cursor-pointer group",
                        carga.excedeTanque 
                          ? 'bg-status-warning-bg hover:bg-status-warning-bg/80' 
                          : 'hover:bg-muted/50'
                      )}
                      style={{
                        animationDelay: `${index * 30}ms`,
                        animation: 'fadeInUp 0.3s ease-out forwards',
                      }}
                    >
                      <TableCell className="font-mono text-sm">{carga.fechaHora}</TableCell>
                      <TableCell>
                        <FuelTypeBadge type={carga.tipoCombustible} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {carga.unidadNumero}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate group-hover:text-primary transition-colors">
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
                            <div className="w-7 h-7 rounded bg-status-success-bg flex items-center justify-center transition-transform group-hover:scale-110">
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground mt-4 pt-4 border-t gap-4">
            <span>Mostrando {filteredCargas.length} de {cargas.length} registros</span>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] py-0">
                  <Fuel className="h-2.5 w-2.5 mr-1" /> Diesel
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-300 text-[10px] py-0">
                  <Droplets className="h-2.5 w-2.5 mr-1" /> Urea/DEF
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-status-warning-bg border border-status-warning"></div>
                <span>Excede capacidad</span>
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

      <ViewCargaModal
        open={!!cargaToView}
        onOpenChange={() => setCargaToView(null)}
        carga={cargaToView}
      />

      {/* Animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CombustibleCargas;
