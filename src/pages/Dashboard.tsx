// src/pages/Dashboard.tsx
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { Loader2, AlertTriangle, RefreshCcw } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";

import { KPICards } from "@/features/dashboard/components/KPICards";
import { OnTimeChart } from "@/features/dashboard/components/OnTimeChart";
import { TopClientsChart } from "@/features/dashboard/components/TopClientsChart";
import { OperatorStatsCharts } from "@/features/dashboard/components/OperatorStatsCharts";
import { RecentServicesTable } from "@/features/dashboard/components/RecentServicesTable";
import { DashboardTrends } from "@/features/dashboard/components/DashboardTrends";
// 1. IMPORTAMOS EL NUEVO COMPONENTE
import { SalesAndWorkshopTrends } from "@/features/dashboard/components/SalesAndWorkshopTrends";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { DashboardData } from "@/features/dashboard/types";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // 2. EXTRAEMOS LA NUEVA DATA DEL HOOK
  const {
    serviceStats,
    clientServices,
    operatorStats,
    recentServices,
    revenueTrend,
    tripConfigTrend,
    fuelTrend,
    dailyRevenue, // <-- NUEVO
    mechanicStats, // <-- NUEVO
    isLoading,
    error,
  } = useDashboard(dateRange?.from, dateRange?.to);

  const handleRetry = () => {
    window.location.reload();
  };

  const dashboardData = {
    serviceStats,
    clientServices,
    operatorStats,
    recentServices,
    revenueTrend: revenueTrend || [],
    tripConfigTrend: tripConfigTrend || [],
    fuelTrend: fuelTrend || [],
  } as DashboardData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Dashboard"
          description="Resumen operativo y financiero en tiempo real"
        />
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          placeholder="Filtrar por periodo"
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center border-2 border-dashed rounded-3xl bg-destructive/5">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-destructive">
            Error de conexión
          </h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2">
            No pudimos obtener las métricas. Verifica que el servidor de Python
            esté activo.
          </p>
          <Button
            variant="outline"
            className="mt-6 gap-2"
            onClick={handleRetry}
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar carga
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute h-6 w-6 rounded-full bg-primary/10 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground font-medium animate-pulse">
              Analizando flota y servicios...
            </p>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">
              sincronizando datos
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* KPI Cards */}
          {serviceStats && <KPICards stats={serviceStats} />}

          {/* Gráficas de Tendencias Mensuales */}
          <DashboardTrends data={dashboardData} />

          {/* 3. AÑADIMOS EL NUEVO COMPONENTE AQUÍ */}
          <SalesAndWorkshopTrends
            dailyRevenue={dailyRevenue as any}
            mechanicStats={mechanicStats as any}
          />

          {/* Fila de Gráficas: Pastel de Puntualidad + Barras de Clientes */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bento-card bento-card-featured">
              {serviceStats && <OnTimeChart stats={serviceStats} />}
            </div>
            <div className="bento-card">
              <TopClientsChart clients={clientServices || []} />
            </div>
          </div>

          {/* Tabla de Servicios Recientes */}
          <div className="bento-card">
            <RecentServicesTable services={recentServices || []} />
          </div>

          {/* Estadísticas de Operadores */}
          <div className="bento-card">
            <OperatorStatsCharts operators={operatorStats || []} />
          </div>

          <p className="text-[10px] text-center text-muted-foreground/50 pb-4">
            Los datos se actualizan automáticamente al cambiar el rango de
            fechas. Métricas calculadas en base a registros de tramos y
            liquidaciones.
          </p>
        </div>
      )}
    </div>
  );
}
