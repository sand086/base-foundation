import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, FileText, Phone, Mail, Wrench } from "lucide-react";
import { Mechanic } from "@/types/api.types";

interface Props {
  data: Mechanic[];
  isLoading: boolean;
  onEdit: (mechanic: Mechanic) => void;
  onOpenExpediente: (mechanic: Mechanic) => void;
}

export function MechanicsTable({
  data,
  isLoading,
  onEdit,
  onOpenExpediente,
}: Props) {
  const columns = [
    {
      key: "nombre_completo",
      header: "Mecánico",
      render: (_: any, row: Mechanic) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border shrink-0">
            <Wrench className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium">
              {row.nombre} {row.apellido}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.especialidad || "General"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col text-sm space-y-1">
          {row.telefono && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400" /> {row.telefono}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-slate-400" /> {row.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "laboral",
      header: "Datos",
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>NSS: {row.nss || "---"}</span>
          <span>RFC: {row.rfc || "---"}</span>
        </div>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (val: boolean) => (
        <Badge
          variant={val ? "success" : "destructive"}
          className={
            val ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""
          }
        >
          {val ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (_: any, row: Mechanic) => (
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenExpediente(row)}
                  className="h-8 w-8 p-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver Expediente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <EnhancedDataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      searchPlaceholder="Buscar por nombre, especialidad..."
    />
  );
}
