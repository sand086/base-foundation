import { TrendingUp, TrendingDown, Clock, Truck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { mockTrips } from "@/data/mockData";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    en_ruta: { type: "success", label: "En Ruta" },
    detenido: { type: "warning", label: "Detenido" },
    retraso: { type: "danger", label: "Retraso" },
    entregado: { type: "success", label: "Entregado" },
  };
  const config = statusMap[status] || { type: "info" as StatusType, label: status };
  return <StatusBadge status={config.type}>{config.label}</StatusBadge>;
};

export default function Dashboard() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader 
        title="Dashboard" 
        description="Resumen operativo en tiempo real" 
      />

      {/* KPI Cards - 3 Top Cards - Data Dense */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* On Time % */}
        <Card className="rounded border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              On Time %
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-brand-green" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-green">92%</span>
              <div className="flex items-center text-[10px] text-brand-green">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +2.1%
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">vs. mes anterior</p>
          </CardContent>
        </Card>

        {/* Total Servicios */}
        <Card className="rounded border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Servicios
            </CardTitle>
            <Truck className="h-3.5 w-3.5 text-brand-dark" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-dark">1,240</span>
              <div className="flex items-center text-[10px] text-brand-green">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +8%
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">este mes</p>
          </CardContent>
        </Card>

        {/* Servicios con Retraso */}
        <Card className="rounded border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Servicios con Retraso
            </CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 text-brand-red" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-red">98</span>
              <div className="flex items-center text-[10px] text-brand-red">
                <TrendingDown className="h-3 w-3 mr-0.5" />
                -12%
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Services Table - High Density */}
      <Card className="rounded border shadow-none">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark">Servicios Activos</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y bg-muted/50">
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">ID</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Cliente</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Unidad</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Operador</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Origen - Destino</th>
                  <th className="text-left py-1.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {mockTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-1.5 px-3 text-xs font-medium text-brand-red">{trip.id}</td>
                    <td className="py-1.5 px-3 text-xs">{trip.clientName}</td>
                    <td className="py-1.5 px-3 text-xs font-mono">{trip.unitNumber}</td>
                    <td className="py-1.5 px-3 text-xs">{trip.operator}</td>
                    <td className="py-1.5 px-3 text-xs">
                      <span className="text-muted-foreground">{trip.origin}</span>
                      <span className="mx-1 text-muted-foreground/50">→</span>
                      <span>{trip.destination}</span>
                    </td>
                    <td className="py-1.5 px-3">{getStatusBadge(trip.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
