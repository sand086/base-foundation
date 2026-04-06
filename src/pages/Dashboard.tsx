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
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";

export default function Dashboard() {
  // 1. Estado para el filtro de fechas (por defecto últimos 30 días)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // 2. Consumo de datos reales desde el backend
  const {
    serviceStats,
    clientServices,
    operatorStats,
    recentServices,
    isLoading,
    error,
  } = useDashboard(dateRange?.from, dateRange?.to);

  // 3. Handler para reintentar la carga en caso de error
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* --- HEADER & FILTERS --- */}
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

      {/* --- CONDITIONAL RENDERING --- */}

      {/* A. ESTADO DE ERROR (Si el backend falla) */}
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
        /* B. ESTADO DE CARGA (Loading Spinner) */
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
              v2.0 Backend Real
            </p>
          </div>
        </div>
      ) : (
        /* C. ESTADO DE DATOS (Dashboard Real) */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* KPI Cards: Métricas principales */}
          {serviceStats && <KPICards stats={serviceStats} />}

          {/* Fila de Gráficas: Pastel de Puntualidad + Barras de Clientes */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bento-card bento-card-featured">
              {serviceStats && <OnTimeChart stats={serviceStats} />}
            </div>
            <div className="bento-card">
              <TopClientsChart clients={clientServices} />
            </div>
          </div>

          {/* Tabla de Servicios Recientes (Full Width) */}
          <div className="bento-card">
            <RecentServicesTable services={recentServices} />
          </div>

          {/* Estadísticas de Operadores */}
          <div className="bento-card">
            <OperatorStatsCharts operators={operatorStats} />
          </div>

          {/* Nota al pie (Footer del Dash) */}
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
