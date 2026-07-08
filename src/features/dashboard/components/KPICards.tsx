import {
  TrendingUp,
  Clock,
  Truck,
  AlertTriangle,
  DollarSign,
  Wrench,
  Droplet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceStats } from "@/features/dashboard/types";
import { useMemo, useRef, useState } from "react";
import { ChartActionMenu } from "@/components/ui/chart-action-menu";
import { ServiceDetailModal } from "./ServiceDetailModal";

interface KPICardsProps {
  stats: ServiceStats;
}

const mockFleetOdometers = [
  { id: "TR-201", numero: "TR-201", odometro: 128500 },
  { id: "TR-202", numero: "TR-202", odometro: 89200 },
  { id: "TR-203", numero: "TR-203", odometro: 147800 },
  { id: "TR-204", numero: "TR-204", odometro: 58900 },
  { id: "TR-205", numero: "TR-205", odometro: 176500 },
];

export function KPICards({ stats }: KPICardsProps) {
  // Estados para manejar el modal de detalles
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    title: string;
    data: any[];
  }>({
    open: false,
    title: "",
    data: [],
  });

  // Referencias para exportar cada tarjeta como imagen
  const refServicios = useRef<HTMLDivElement>(null);
  const refOnTime = useRef<HTMLDivElement>(null);
  const refTardios = useRef<HTMLDivElement>(null);
  const refIngresos = useRef<HTMLDivElement>(null);
  const refEficiencia = useRef<HTMLDivElement>(null);
  const refMantenimiento = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const maintenanceAlerts = useMemo(() => {
    return mockFleetOdometers.filter((unit) => {
      const kmSinceLastService = unit.odometro % 30000;
      return kmSinceLastService > 28000;
    });
  }, []);

  const openDetail = (title: string, value: any, label: string) => {
    setDetailModal({
      open: true,
      title,
      data: [{ name: label, value: value }], // Aquí podrías pasar un desglose real si el backend lo da
    });
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        {/* Total Servicios */}
        <Card
          ref={refServicios}
          className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden dark:text-white"
        >
          <CardHeader className="pb-2 pt-4 px-4 ">
            <CardTitle>
              <ChartActionMenu
                title="Servicios"
                data={[
                  { concepto: "Total Servicios", valor: stats.totalServices },
                ]}
                containerRef={refServicios}
                onViewDetail={() =>
                  openDetail(
                    "Total Servicios",
                    stats.totalServices,
                    "Servicios Realizados",
                  )
                }
              />
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-brand-dark/10 flex items-center justify-center mt-2 ">
              <Truck className="h-4 w-4 text-brand-dark dark:text-white" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-dark dark:text-white tracking-tight">
                {stats.totalServices.toLocaleString("es-MX")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* On Time % */}
        <Card
          ref={refOnTime}
          className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden dark:text-white"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle>
              <ChartActionMenu
                title="Puntualidad"
                data={[
                  { concepto: "On Time %", valor: stats.onTimePercentage },
                ]}
                containerRef={refOnTime}
                onViewDetail={() =>
                  openDetail(
                    "On Time %",
                    stats.onTimePercentage,
                    "Porcentaje de Entrega",
                  )
                }
              />
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center mt-2">
              <Clock className="h-4 w-4 text-brand-green" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-green dark:text-white tracking-tight">
                {stats.onTimePercentage}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Servicios con Retraso */}
        <Card
          ref={refTardios}
          className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden "
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle>
              <ChartActionMenu
                title="Tardíos"
                data={[
                  { concepto: "Servicios Retrasados", valor: stats.lateCount },
                ]}
                containerRef={refTardios}
                onViewDetail={() =>
                  openDetail(
                    "Servicios Tardíos",
                    stats.lateCount,
                    "Unidades con Retraso",
                  )
                }
              />
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-brand-red/10 flex items-center justify-center mt-2">
              <AlertTriangle className="h-4 w-4 text-brand-red" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-red dark:text-white tracking-tight">
                {stats.lateCount}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos */}
        <Card
          ref={refIngresos}
          className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden "
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle>
              <ChartActionMenu
                title="Ingresos"
                data={[
                  {
                    concepto: "Ganancia Estimada",
                    valor: stats.estimatedRevenue,
                  },
                ]}
                containerRef={refIngresos}
                onViewDetail={() =>
                  openDetail(
                    "Ingresos Reales",
                    stats.estimatedRevenue,
                    "Suma de Monto",
                  )
                }
              />
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center mt-2">
              <DollarSign className="h-4 w-4 text-brand-green" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-dark dark:text-white tracking-tight">
                {formatCurrency(stats.estimatedRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Eficiencia */}
        <Card
          ref={refEficiencia}
          className="kpi-card rounded-2xl border-0 shadow-none glass-card overflow-hidden dark:text-white"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle>
              <ChartActionMenu
                title="Diésel"
                data={[
                  {
                    concepto: "Rendimiento Global",
                    valor: stats.avgRendimiento,
                  },
                ]}
                containerRef={refEficiencia}
                onViewDetail={() =>
                  openDetail(
                    "Eficiencia de Combustible",
                    stats.avgRendimiento,
                    "KM/L Promedio",
                  )
                }
              />
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center mt-2">
              <Droplet className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-white tracking-tight">
                {stats.avgRendimiento}
              </span>
            </div>
            <p className="text-xs text-muted-foreground  dark:text-slate-300 mt-1 ">
              {stats.totalKms.toLocaleString("es-MX")} km
            </p>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card
          ref={refMantenimiento}
          className={`kpi-card rounded-2xl border-0 shadow-none  overflow-hidden ${maintenanceAlerts.length > 0 ? "bg-amber-50" : "glass-card"}`}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle>
              <ChartActionMenu
                title="Taller"
                data={maintenanceAlerts}
                containerRef={refMantenimiento}
                onViewDetail={() =>
                  setDetailModal({
                    open: true,
                    title: "Unidades en Alerta",
                    data: maintenanceAlerts.map((m) => ({
                      name: m.numero,
                      value: m.odometro,
                    })),
                  })
                }
              />
            </CardTitle>
            <Wrench
              className={`h-4 w-4 mt-2 ${maintenanceAlerts.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span
              className={`text-3xl font-bold  tracking-tight ${maintenanceAlerts.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-brand-dark dark:text-white"}`}
            >
              {maintenanceAlerts.length}
            </span>
            <p className="text-[10px] text-muted-foreground dark:text-slate-300 font-medium">
              Próximos servicios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal Reutilizado */}
      <ServiceDetailModal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ ...detailModal, open: false })}
        title={detailModal.title}
        data={detailModal.data}
      />
    </>
  );
}
