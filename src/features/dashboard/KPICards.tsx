import { TrendingUp, TrendingDown, Clock, Truck, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceStats } from "@/data/dashboardData";

interface KPICardsProps {
  stats: ServiceStats;
}

export function KPICards({ stats }: KPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {/* Total Servicios */}
      <Card className="rounded-xl border-0 shadow-none glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Servicios
          </CardTitle>
          <Truck className="h-3.5 w-3.5 text-brand-dark" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-dark">
              {stats.totalServices.toLocaleString('es-MX')}
            </span>
            <div className="flex items-center text-[10px] text-brand-green">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +8%
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">en el periodo</p>
        </CardContent>
      </Card>

      {/* On Time % */}
      <Card className="rounded-xl border-0 shadow-none glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            On Time %
          </CardTitle>
          <Clock className="h-3.5 w-3.5 text-brand-green" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-green">
              {stats.onTimePercentage}%
            </span>
            <div className="flex items-center text-[10px] text-brand-green">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +2.1%
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.onTimeCount.toLocaleString('es-MX')} de {stats.totalServices.toLocaleString('es-MX')}
          </p>
        </CardContent>
      </Card>

      {/* Servicios con Retraso */}
      <Card className="rounded-xl border-0 shadow-none glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Servicios Tardíos
          </CardTitle>
          <AlertTriangle className="h-3.5 w-3.5 text-brand-red" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-red">
              {stats.lateCount}
            </span>
            <div className="flex items-center text-[10px] text-brand-red">
              <TrendingDown className="h-3 w-3 mr-0.5" />
              -12%
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">requieren atención</p>
        </CardContent>
      </Card>

      {/* Ingresos Estimados */}
      <Card className="rounded-xl border-0 shadow-none glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ingresos Estimados
          </CardTitle>
          <DollarSign className="h-3.5 w-3.5 text-brand-green" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-brand-dark">
              {formatCurrency(stats.estimatedRevenue)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">en el periodo</p>
        </CardContent>
      </Card>
    </div>
  );
}
