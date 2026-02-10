import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { OperatorDetailSheet } from "./OperatorDetailSheet";
import { getExpiryStatus, getExpiryLabel } from "@/data/flotaData";
import { Operador } from "@/services/operatorService";

interface OperadoresTableProps {
  operadores: Operador[];
  onEdit?: (operador: Operador) => void;
  onDelete?: (id: number) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "activo":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200">
          Activo
        </Badge>
      );
    case "inactivo":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200">
          Inactivo
        </Badge>
      );
    case "vacaciones":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200">
          Vacaciones
        </Badge>
      );
    case "incapacidad":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200">
          Incapacidad
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const ExpiryBadge = ({ date, label }: { date: string; label: string }) => {
  const status = getExpiryStatus(date);
  const expiryLabel = getExpiryLabel(date);
  // Mapeo seguro de tipos
  const statusMap: Record<string, StatusType> = {
    danger: "danger",
    warning: "warning",
    success: "success",
  };
  const iconMap: Record<string, React.ReactNode> = {
    danger: <AlertTriangle className="h-3 w-3 mr-1" />,
    warning: <Clock className="h-3 w-3 mr-1" />,
    success: <CheckCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <StatusBadge
        status={statusMap[status] || "default"}
        className="flex items-center w-fit"
      >
        {iconMap[status]} {expiryLabel}
      </StatusBadge>
    </div>
  );
};

export function OperadoresTable({
  operadores,
  onEdit,
  onDelete,
}: OperadoresTableProps) {
  const [selectedOperator, setSelectedOperator] = useState<Operador | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (operador: Operador) => {
    setSelectedOperator(operador);
    setIsDetailOpen(true);
  };

  const columns: ColumnDef<Operador>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Operador",
        sortable: true,
        render: (_, operador) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">
              {operador.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ID: {operador.id} • Lic: {operador.license_type}
            </span>
          </div>
        ),
      },
      {
        key: "license_number",
        header: "Licencia",
        sortable: true,
        render: (value) => <span className="font-mono text-sm">{value}</span>,
      },
      {
        key: "license_expiry",
        header: "Vig. Licencia",
        sortable: true,
        render: (value) => (
          <ExpiryBadge
            date={value as string}
            label={
              value
                ? format(new Date(value as string), "dd MMM yyyy", {
                    locale: es,
                  })
                : "N/A"
            }
          />
        ),
      },
      {
        key: "medical_check_expiry",
        header: "Examen Médico",
        sortable: true,
        render: (value) => (
          <ExpiryBadge
            date={value as string}
            label={
              value
                ? format(new Date(value as string), "dd MMM yyyy", {
                    locale: es,
                  })
                : "N/A"
            }
          />
        ),
      },
      {
        key: "phone",
        header: "Teléfono",
        render: (value) => (
          <a
            href={`tel:${value}`}
            className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
          >
            <Phone className="h-3 w-3" /> {value || "--"}
          </a>
        ),
      },
      {
        key: "assigned_unit", // Nota: assigned_unit puede venir undefined del backend si no hacemos join
        header: "Unidad",
        render: (value) =>
          value ? (
            <Badge variant="outline" className="font-mono">
              {value}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">Sin asignar</span>
          ),
      },
      {
        key: "status",
        header: "Estatus",
        sortable: true,
        render: (value) => getStatusBadge(value as string),
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        width: "w-[80px]",
        render: (_, operador) => (
          <div
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewDetails(operador)}>
                  <Eye className="h-4 w-4 mr-2" /> Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(operador)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(operador.id)}
                >
                  <UserX className="h-4 w-4 mr-2" /> Dar de Baja
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <Card className="overflow-hidden border-none shadow-none">
      <CardHeader className="pb-4 px-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" /> Listado de Operadores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <EnhancedDataTable data={operadores} columns={columns} />
      </CardContent>

      <OperatorDetailSheet
        operator={selectedOperator as any} // Cast temporal si el sheet usa tipos viejos
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Card>
  );
}
