import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, StatusType } from '@/components/ui/status-badge';
import { EnhancedDataTable, ColumnDef } from '@/components/ui/enhanced-data-table';
import {
  FileText,
  Eye,
  Edit,
  MoreHorizontal,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserX,
} from 'lucide-react';
import {
  Operador,
  getExpiryStatus,
  getExpiryLabel,
} from '@/data/flotaData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { OperatorDetailSheet } from './OperatorDetailSheet';

interface OperadoresTableProps {
  operadores: Operador[];
  onEdit?: (operador: Operador) => void;
  onDelete?: (id: string) => void;
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

export function OperadoresTable({ operadores, onEdit, onDelete }: OperadoresTableProps) {
  // State for detail sheet
  const [selectedOperator, setSelectedOperator] = useState<Operador | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (operador: Operador) => {
    setSelectedOperator(operador);
    setIsDetailOpen(true);
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<Operador>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Operador',
      sortable: true,
      render: (_, operador) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {operador.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {operador.id} • Tipo {operador.license_type}
          </span>
        </div>
      ),
    },
    {
      key: 'license_number',
      header: 'Licencia',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'license_expiry',
      header: 'Vig. Licencia',
      type: 'date',
      sortable: true,
      render: (value) => (
        <ExpiryBadge
          date={value}
          label={format(new Date(value), 'dd MMM yyyy', { locale: es })}
        />
      ),
    },
    {
      key: 'medical_check_expiry',
      header: 'Examen Médico',
      type: 'date',
      sortable: true,
      render: (value) => (
        <ExpiryBadge
          date={value}
          label={format(new Date(value), 'dd MMM yyyy', { locale: es })}
        />
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (value) => (
        <a
          href={`tel:${value}`}
          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
        >
          <Phone className="h-3 w-3" />
          {value}
        </a>
      ),
    },
    {
      key: 'assigned_unit',
      header: 'Unidad',
      render: (value) => (
        value ? (
          <Badge variant="outline" className="font-mono">
            {value}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Estatus',
      type: 'status',
      statusOptions: ['activo', 'inactivo', 'vacaciones', 'incapacidad'],
      sortable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'actions',
      header: 'Acciones',
      sortable: false,
      width: 'w-[80px]',
      render: (_, operador) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem 
                className="gap-2"
                onClick={() => handleViewDetails(operador)}
              >
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
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => onDelete?.(operador.id)}
              >
                <UserX className="h-4 w-4" />
                Dar de Baja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [onEdit, onDelete]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Listado de Operadores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-6 pb-6">
        <EnhancedDataTable
          data={operadores}
          columns={columns}
          exportFileName="operadores"
        />
      </CardContent>

      {/* Operator Detail Sheet */}
      <OperatorDetailSheet
        operator={selectedOperator}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Card>
  );
}
