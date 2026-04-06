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
import { Operator } from "@/types/api.types";
import { cn } from "@/lib/utils";

interface OperadoresTableProps {
  operadores: Operator[];
  onEdit?: (operador: Operator) => void;
  onDelete?: (id: number) => void;
}

// --- HELPERS TRASLADADOS DE FLOTADATA ---
const getExpiryStatus = (dateStr?: string) => {
  if (!dateStr) return "danger";
  const days = Math.floor(
    (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
  );
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
};

const getExpiryLabel = (dateStr?: string) => {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString("es-MX", { timeZone: "UTC" });
};
// ----------------------------------------

const getStatusBadge = (status: string) => {
  const baseClass =
    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm";
  switch (status?.toLowerCase()) {
    case "activo":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
          )}
        >
          Activo
        </Badge>
      );
    case "inactivo":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
          )}
        >
          Inactivo
        </Badge>
      );
    case "vacaciones":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
          )}
        >
          Vacaciones
        </Badge>
      );
    case "incapacidad":
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
          )}
        >
          Incapacidad
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            baseClass,
            "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
          )}
        >
          {status || "Desconocido"}
        </Badge>
      );
  }
};

const ExpiryBadge = ({ date, label }: { date: string; label: string }) => {
  const status = getExpiryStatus(date);
  const expiryLabel = getExpiryLabel(date);

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
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <StatusBadge
        status={statusMap[status] || "default"}
        className="flex items-center w-fit text-[9px] font-bold uppercase tracking-widest shadow-sm"
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
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (operador: Operator) => {
    setSelectedOperator(operador);
    setIsDetailOpen(true);
  };

  const columns: ColumnDef<Operator>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Operador",
        sortable: true,
        render: (_, operador) => (
          <div className="flex flex-col">
            <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
              {operador.name}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
              ID: {operador.id} • Lic: {operador.license_type}
            </span>
          </div>
        ),
      },
      {
        key: "license_number",
        header: "Licencia",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
            {value}
          </span>
        ),
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
            className="flex items-center gap-1 font-mono text-sm font-bold text-brand-navy dark:text-blue-400 hover:text-brand-red transition-colors"
          >
            <Phone className="h-3.5 w-3.5" /> {value || "--"}
          </a>
        ),
      },
      {
        key: "assigned_unit", // Puede requerir join desde el backend o venir como unit_id
        header: "Unidad",
        render: (value, operador) =>
          value || operador.assigned_unit_id ? (
            <Badge
              variant="outline"
              className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-bold"
            >
              {value || `ECO-${operador.assigned_unit_id}`}
            </Badge>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">
              En Patio
            </span>
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
            className="flex justify-end pr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
              >
                <DropdownMenuItem
                  onClick={() => handleViewDetails(operador)}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Eye className="h-4 w-4 text-brand-navy dark:text-slate-400" />{" "}
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit?.(operador)}
                  className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                >
                  <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />{" "}
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-white/10" />
                <DropdownMenuItem
                  className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
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
    <Card variant="default" className="shadow-2xl border-none overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
        <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
          <FileText className="h-6 w-6 text-brand-red" /> Listado de Operadores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
        <EnhancedDataTable
          data={operadores}
          columns={columns}
          className="border-none"
        />
      </CardContent>

      <OperatorDetailSheet
        operator={selectedOperator as any}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Card>
  );
}
