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

const getStatusConfig = (
  status: string,
): { type: StatusType; label: string } => {
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

  const handleViewInDispatch = (
    e: React.MouseEvent,
    service: RecentService,
  ) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      serviceId: service.id,
      filter: "service",
    });
    navigate(`/despacho?${params.toString()}`);
  };

  return (
    <Card className="rounded-2xl border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
          Últimos Servicios
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Click en fila para ver en Monitoreo
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-hidden rounded-xl mx-4 mb-4 liquid-glass-table">
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-xl">
                <tr className="border-b border-muted/20">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Ruta
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Operador
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Estatus
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
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
                      className="group border-b border-muted/20 dark:border-white/5 hover:bg-muted/40 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                    >
                      <td className="py-4 px-4 text-sm font-medium text-brand-red">
                        {service.id}
                      </td>
                      <td className="py-4 px-4 text-sm max-w-[160px] truncate">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                {service.clientName.length > 22
                                  ? `${service.clientName.substring(0, 22)}...`
                                  : service.clientName}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{service.clientName}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className="text-muted-foreground">
                          {service.origin}
                        </span>
                        <span className="mx-2 text-muted-foreground/40">→</span>
                        <span>{service.destination}</span>
                      </td>
                      <td className="py-4 px-4 text-sm max-w-[140px] truncate">
                        {service.operator}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={statusConfig.type}>
                          {statusConfig.label}
                        </StatusBadge>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {service.date}
                      </td>
                      <td className="py-4 px-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={(e) =>
                                  handleViewInDispatch(e, service)
                                }
                              >
                                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-brand-dark" />
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
        </div>
      </CardContent>
    </Card>
  );
}
