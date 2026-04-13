import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
//  Cambiamos la ruta al nuevo servicio centralizado
import { RecentService } from "@/features/dashboard/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecentServicesTableProps {
  services: RecentService[];
}

/**
 * 🛠️ Configuración de estados actualizada para coincidir
 * con los Enums de TripStatus en el backend de Python.
 */
const getStatusConfig = (
  status: string,
): { type: StatusType; label: string } => {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    creado: { type: "info", label: "Creado" },
    programado: { type: "info", label: "Programado" },
    en_transito: { type: "success", label: "En Tránsito" },
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    entregado: { type: "success", label: "Entregado" },
    cerrado: { type: "info", label: "Cerrado" },
  };
  return statusMap[status] || { type: "info", label: status };
};

export function RecentServicesTable({ services }: RecentServicesTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (service: RecentService) => {
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
    navigate(`/Dispatch?${params.toString()}`);
  };

  return (
    <Card className="rounded-2xl shadow-2xl border-none overflow-hidden bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
        <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
          Últimos Servicios
        </CardTitle>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Click en fila para ver en Monitoreo
        </span>
      </CardHeader>
      <CardContent className="p-0 bg-white dark:bg-slate-950">
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Cliente
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Ruta
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Operador
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Estatus
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-transparent">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const statusConfig = getStatusConfig(service.status);
                return (
                  <tr
                    key={service.id}
                    onClick={() => handleRowClick(service)}
                    className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  >
                    <td className="py-4 px-4 font-mono text-sm font-bold text-brand-red uppercase">
                      {service.id}
                    </td>
                    <td className="py-4 px-4 max-w-[160px] truncate">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight text-sm cursor-default">
                              {service.clientName.length > 22
                                ? `${service.clientName.substring(0, 22)}...`
                                : service.clientName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-brand-navy border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-white">
                            {service.clientName}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span>{service.origin}</span>
                      <span className="mx-2 text-slate-300 dark:text-slate-600">→</span>
                      <span className="text-slate-700 dark:text-slate-300">{service.destination}</span>
                    </td>
                    <td className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                      {service.operator}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={statusConfig.type}>
                        {statusConfig.label}
                      </StatusBadge>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {service.date}
                    </td>
                    <td className="py-4 px-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press opacity-0 group-hover:opacity-100"
                              onClick={(e) =>
                                handleViewInDispatch(e, service)
                              }
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-brand-navy border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-white">
                            Ver en Dispatch
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
