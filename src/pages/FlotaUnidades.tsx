import { Truck, FileText, Search, Plus, Eye, Settings, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

// Mock fleet data
const mockFleet = [
  {
    id: 'UNIT-001',
    numeroEconomico: 'TR-204',
    placas: 'AAA-000-A',
    modelo: 'Freightliner Cascadia',
    year: 2022,
    status: 'en_ruta' as const,
    operador: 'Juan Pérez González',
    documentosVencidos: 1,
    llantasCriticas: 1,
  },
  {
    id: 'UNIT-002',
    numeroEconomico: 'TR-118',
    placas: 'BBB-111-B',
    modelo: 'Kenworth T680',
    year: 2021,
    status: 'disponible' as const,
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-003',
    numeroEconomico: 'TR-156',
    placas: 'CCC-222-C',
    modelo: 'Volvo VNL 760',
    year: 2023,
    status: 'bloqueado' as const,
    operador: null,
    documentosVencidos: 2,
    llantasCriticas: 0,
  },
  {
    id: 'UNIT-004',
    numeroEconomico: 'TR-089',
    placas: 'DDD-333-D',
    modelo: 'International LT625',
    year: 2020,
    status: 'mantenimiento' as const,
    operador: null,
    documentosVencidos: 0,
    llantasCriticas: 2,
  },
  {
    id: 'UNIT-005',
    numeroEconomico: 'TR-201',
    placas: 'EEE-444-E',
    modelo: 'Freightliner Cascadia',
    year: 2022,
    status: 'en_ruta' as const,
    operador: 'Fernando García Vega',
    documentosVencidos: 0,
    llantasCriticas: 0,
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'disponible':
      return <Badge className="bg-status-success text-white">Disponible</Badge>;
    case 'en_ruta':
      return <Badge className="bg-blue-600 text-white">En Ruta</Badge>;
    case 'mantenimiento':
      return <Badge className="bg-status-warning text-black">Mantenimiento</Badge>;
    case 'bloqueado':
      return <Badge className="bg-status-danger text-white">Bloqueado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function FlotaUnidades() {
  const navigate = useNavigate();
  
  const disponibles = mockFleet.filter(u => u.status === 'disponible').length;
  const enRuta = mockFleet.filter(u => u.status === 'en_ruta').length;
  const bloqueadas = mockFleet.filter(u => u.status === 'bloqueado').length;
  const mantenimiento = mockFleet.filter(u => u.status === 'mantenimiento').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Catálogo de Unidades
          </h1>
          <p className="text-muted-foreground">Gestión de flota vehicular y documentación</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Unidad
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <p className="text-3xl font-bold text-status-success">{disponibles}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">En Ruta</p>
            <p className="text-3xl font-bold text-blue-600">{enRuta}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mantenimiento</p>
            <p className="text-3xl font-bold text-status-warning">{mantenimiento}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bloqueadas</p>
                <p className="text-3xl font-bold text-status-danger">{bloqueadas}</p>
              </div>
              {bloqueadas > 0 && <AlertTriangle className="h-6 w-6 text-status-danger" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por número económico, placas o modelo..." className="pl-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Listado de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-3">No. Económico</th>
                <th className="py-3 px-3">Placas</th>
                <th className="py-3 px-3">Modelo</th>
                <th className="py-3 px-3">Año</th>
                <th className="py-3 px-3">Operador Asignado</th>
                <th className="py-3 px-3">Docs. Vencidos</th>
                <th className="py-3 px-3">Llantas Críticas</th>
                <th className="py-3 px-3">Estatus</th>
                <th className="py-3 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mockFleet.map((unit) => (
                <tr key={unit.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-3 font-bold">{unit.numeroEconomico}</td>
                  <td className="py-3 px-3 font-mono text-sm">{unit.placas}</td>
                  <td className="py-3 px-3">{unit.modelo}</td>
                  <td className="py-3 px-3">{unit.year}</td>
                  <td className="py-3 px-3">{unit.operador || <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 px-3">
                    {unit.documentosVencidos > 0 ? (
                      <Badge className="bg-status-danger text-white">{unit.documentosVencidos}</Badge>
                    ) : (
                      <Badge className="bg-status-success text-white">0</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {unit.llantasCriticas > 0 ? (
                      <Badge className="bg-status-danger text-white">{unit.llantasCriticas}</Badge>
                    ) : (
                      <Badge className="bg-status-success text-white">0</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3">{getStatusBadge(unit.status)}</td>
                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/flota/unidad/${unit.numeroEconomico}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
