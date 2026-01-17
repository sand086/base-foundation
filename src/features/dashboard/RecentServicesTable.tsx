import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { RecentService } from "@/data/dashboardData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecentServicesTableProps {
  services: RecentService[];
}

const getStatusConfig = (status: string): { type: StatusType; label: string } => {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    entregado: { type: "success", label: "Entregado" },
    programado: { type: "info", label: "Programado" },
  };
  return statusMap[status] || { type: "info", label: status };
};

export function RecentServicesTable({ services }: RecentServicesTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (service: RecentService) => {
    // Navigate to monitoring with URL params for filtering
    const params = new URLSearchParams({
      serviceId: service.id,
      clientId: service.clientId,
    });
    navigate(`/monitoreo?${params.toString()}`);
  };

  const handleViewInDispatch = (e: React.MouseEvent, service: RecentService) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      serviceId: service.id,
      filter: 'service',
    });
    navigate(`/despacho?${params.toString()}`);
  };

  return (
    <Card className="rounded border shadow-none">
      <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-brand-dark">
          Últimos Servicios
        </CardTitle>
        <span className="text-[10px] text-muted-foreground">
          Click en fila para ver en Monitoreo
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y bg-muted/50">
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  ID
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Cliente
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Ruta
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Operador
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Estatus
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Fecha
                </th>
                <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {services.slice(0, 10).map((service) => {
                const statusConfig = getStatusConfig(service.status);
                return (
                  <tr
                    key={service.id}
                    onClick={() => handleRowClick(service)}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-1.5 px-3 text-xs font-medium text-brand-red">
                      {service.id}
                    </td>
                    <td className="py-1.5 px-3 text-xs max-w-[140px] truncate">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              {service.clientName.length > 20
                                ? `${service.clientName.substring(0, 20)}...`
                                : service.clientName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{service.clientName}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-1.5 px-3 text-xs">
                      <span className="text-muted-foreground">{service.origin}</span>
                      <span className="mx-1 text-muted-foreground/50">→</span>
                      <span>{service.destination}</span>
                    </td>
                    <td className="py-1.5 px-3 text-xs max-w-[120px] truncate">
                      {service.operator}
                    </td>
                    <td className="py-1.5 px-3">
                      <StatusBadge status={statusConfig.type}>
                        {statusConfig.label}
                      </StatusBadge>
                    </td>
                    <td className="py-1.5 px-3 text-xs text-muted-foreground">
                      {service.date}
                    </td>
                    <td className="py-1.5 px-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleViewInDispatch(e, service)}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-brand-dark" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver en Despacho</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
