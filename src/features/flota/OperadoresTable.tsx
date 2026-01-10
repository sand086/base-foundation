import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, StatusType } from '@/components/ui/status-badge';
import {
  FileText,
  Search,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  mockOperadores,
  Operador,
  getExpiryStatus,
  getExpiryLabel,
} from '@/data/flotaData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OperadoresTableProps {
  onEdit?: (operador: Operador) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'activo':
      return <Badge className="bg-status-success text-white">Activo</Badge>;
    case 'inactivo':
      return <Badge className="bg-status-danger text-white">Inactivo</Badge>;
    case 'vacaciones':
      return <Badge className="bg-status-info text-white">Vacaciones</Badge>;
    case 'incapacidad':
      return <Badge className="bg-status-warning text-black">Incapacidad</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const ExpiryBadge = ({ date, label }: { date: string; label: string }) => {
  const status = getExpiryStatus(date);
  const expiryLabel = getExpiryLabel(date);

  const statusMap: Record<string, StatusType> = {
    danger: 'danger',
    warning: 'warning',
    success: 'success',
  };

  const iconMap: Record<string, React.ReactNode> = {
    danger: <AlertTriangle className="h-3 w-3 mr-1" />,
    warning: <Clock className="h-3 w-3 mr-1" />,
    success: <CheckCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <StatusBadge status={statusMap[status]} className="flex items-center">
        {iconMap[status]}
        {expiryLabel}
      </StatusBadge>
    </div>
  );
};

export function OperadoresTable({ onEdit }: OperadoresTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useState(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  });

  const filteredOperadores = mockOperadores.filter(
    (op) =>
      op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.phone.includes(searchQuery)
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Listado de Operadores
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, licencia..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">Licencia</th>
                <th className="py-3 px-4">Vig. Licencia</th>
                <th className="py-3 px-4">Examen Médico</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr
                    key={idx}
                    className="border-b animate-pulse"
                  >
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-6 bg-muted rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-6 bg-muted rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-6 bg-muted rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-8 bg-muted rounded w-20 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredOperadores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No se encontraron operadores con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredOperadores.map((operador, index) => (
                  <tr
                    key={operador.id}
                    className="border-b transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer group"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.3s ease-out forwards',
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {operador.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {operador.id} • Tipo {operador.license_type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">
                      {operador.license_number}
                    </td>
                    <td className="py-3 px-4">
                      <ExpiryBadge
                        date={operador.license_expiry}
                        label={format(new Date(operador.license_expiry), 'dd MMM yyyy', { locale: es })}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <ExpiryBadge
                        date={operador.medical_check_expiry}
                        label={format(new Date(operador.medical_check_expiry), 'dd MMM yyyy', { locale: es })}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`tel:${operador.phone}`}
                        className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {operador.phone}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      {operador.assigned_unit ? (
                        <Badge variant="outline" className="font-mono">
                          {operador.assigned_unit}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(operador.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => onEdit?.(operador)}
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Add the fadeInUp animation */}
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
    </Card>
  );
}
