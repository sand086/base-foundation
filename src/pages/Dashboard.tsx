import { TrendingUp, Truck, Fuel, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardKPIs, mockTrips } from "@/data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const trendData = [
  { name: "Lun", onTime: 92, fuel: 3.6 },
  { name: "Mar", onTime: 95, fuel: 3.9 },
  { name: "Mié", onTime: 88, fuel: 3.7 },
  { name: "Jue", onTime: 96, fuel: 4.0 },
  { name: "Vie", onTime: 94, fuel: 3.8 },
  { name: "Sáb", onTime: 97, fuel: 4.1 },
  { name: "Dom", onTime: 94, fuel: 3.8 },
];

const getStatusBadge = (status: string) => {
  const styles = {
    en_ruta: "bg-status-info-bg text-status-info",
    detenido: "bg-status-warning-bg text-status-warning",
    retraso: "bg-status-danger-bg text-status-danger animate-pulse-danger",
    entregado: "bg-status-success-bg text-status-success",
  };
  const labels = { en_ruta: "En Ruta", detenido: "Detenido", retraso: "Retraso", entregado: "Entregado" };
  return <Badge className={styles[status as keyof typeof styles]}>{labels[status as keyof typeof labels]}</Badge>;
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen operativo de Rápidos 3T</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Delivery</CardTitle>
            <Clock className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-success">{dashboardKPIs.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground mt-1">+2.1% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia Combustible</CardTitle>
            <Fuel className="h-4 w-4 text-status-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardKPIs.fuelEfficiency} km/L</div>
            <p className="text-xs text-muted-foreground mt-1">Promedio de flota</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viajes Activos</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardKPIs.activeTrips}</div>
            <p className="text-xs text-muted-foreground mt-1">{dashboardKPIs.unitsInMaintenance} unidades en mantenimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cartera Vencida</CardTitle>
            <DollarSign className="h-4 w-4 text-status-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-danger">${(dashboardKPIs.totalVencido / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">{dashboardKPIs.pendingInvoices} facturas pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Tendencia Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Area type="monotone" dataKey="onTime" stroke="hsl(var(--status-success))" fill="hsl(var(--status-success-bg))" name="On-Time %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Active Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Viajes Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-3">Servicio ID</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Unidad</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Ruta</th>
                  <th className="py-3 px-3">Estatus</th>
                  <th className="py-3 px-3">Última Actualización</th>
                </tr>
              </thead>
              <tbody>
                {mockTrips.map((trip) => (
                  <tr key={trip.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-3 font-medium">{trip.id}</td>
                    <td className="py-3 px-3">{trip.clientName}</td>
                    <td className="py-3 px-3">{trip.unitNumber}</td>
                    <td className="py-3 px-3">{trip.operator}</td>
                    <td className="py-3 px-3">{trip.origin} → {trip.destination}</td>
                    <td className="py-3 px-3">{getStatusBadge(trip.status)}</td>
                    <td className="py-3 px-3 text-muted-foreground">{trip.lastUpdate}</td>
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
