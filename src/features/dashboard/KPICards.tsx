import { TrendingUp, TrendingDown, Clock, Truck, AlertTriangle, DollarSign, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceStats } from "@/data/dashboardData";
import { useMemo } from "react";

interface KPICardsProps {
  stats: ServiceStats;
}

// Mock fleet data for maintenance alerts
const mockFleetOdometers = [
  { id: 'TR-201', numero: 'TR-201', odometro: 128500 },
  { id: 'TR-202', numero: 'TR-202', odometro: 89200 },
  { id: 'TR-203', numero: 'TR-203', odometro: 147800 },
  { id: 'TR-204', numero: 'TR-204', odometro: 58900 },
  { id: 'TR-205', numero: 'TR-205', odometro: 176500 },
];

export function KPICards({ stats }: KPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate maintenance alerts: units where (odometer % 30000) > 28000
  const maintenanceAlerts = useMemo(() => {
    return mockFleetOdometers.filter(unit => {
      const kmSinceLastService = unit.odometro % 30000;
      return kmSinceLastService > 28000;
    });
  }, []);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {/* Total Servicios */}
      <Card className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Servicios
          </CardTitle>
          <div className="h-8 w-8 rounded-xl bg-brand-dark/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-brand-dark" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-dark tracking-tight">
              {stats.totalServices.toLocaleString('es-MX')}
            </span>
            <div className="flex items-center text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +8%
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">en el periodo</p>
        </CardContent>
      </Card>

      {/* On Time % */}
      <Card className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            On Time %
          </CardTitle>
          <div className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-brand-green" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-green tracking-tight">
              {stats.onTimePercentage}%
            </span>
            <div className="flex items-center text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +2.1%
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.onTimeCount.toLocaleString('es-MX')} de {stats.totalServices.toLocaleString('es-MX')}
          </p>
        </CardContent>
      </Card>

      {/* Servicios con Retraso */}
      <Card className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Servicios Tardíos
          </CardTitle>
          <div className="h-8 w-8 rounded-xl bg-brand-red/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-brand-red" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-red tracking-tight">
              {stats.lateCount}
            </span>
            <div className="flex items-center text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3 mr-0.5" />
              -12%
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">requieren atención</p>
        </CardContent>
      </Card>

      {/* Ingresos Estimados */}
      <Card className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ingresos Estimados
          </CardTitle>
          <div className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-brand-green" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-dark tracking-tight">
              {formatCurrency(stats.estimatedRevenue)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">en el periodo</p>
        </CardContent>
      </Card>

      {/* Maintenance Alerts - Amber KPI */}
      {maintenanceAlerts.length > 0 && (
        <Card className="kpi-card rounded-2xl border-0 shadow-none overflow-hidden bg-amber-50 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Mantenimiento Próximo
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-700 tracking-tight">
                {maintenanceAlerts.length}
              </span>
              <span className="text-xs text-amber-600 font-medium">
                unidad{maintenanceAlerts.length > 1 ? 'es' : ''}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {maintenanceAlerts.slice(0, 2).map((unit) => (
                <p key={unit.id} className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-mono font-medium">{unit.numero}</span>
                  <span className="text-amber-600">próximo a 30K km</span>
                </p>
              ))}
              {maintenanceAlerts.length > 2 && (
                <p className="text-xs text-amber-600">
                  +{maintenanceAlerts.length - 2} más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
