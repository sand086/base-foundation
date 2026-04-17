import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperatorStats } from "@/features/dashboard/types";
import { useMemo, useRef, useState } from "react";
import { ChartActionMenu } from "@/components/ui/chart-action-menu";
import { ServiceDetailModal } from "./ServiceDetailModal";

interface OperatorStatsChartsProps {
  operators: OperatorStats[];
}

export function OperatorStatsCharts({ operators }: OperatorStatsChartsProps) {
  const revenueRef = useRef<HTMLDivElement>(null);
  const rendimientoRef = useRef<HTMLDivElement>(null);
  const incidentsRef = useRef<HTMLDivElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    open: boolean;
    title: string;
    data: any[];
  }>({
    open: false,
    title: "",
    data: [],
  });

  // 1. Transformación: Top Operadores por Ingresos ($)
  const revenueData = useMemo(() => {
    return operators
      .map((op) => ({
        name: op.shortName || op.name,
        ingresos: op.revenue || 0, // CORRECCIÓN: Usamos op.revenue que sí existe en tu type actual
      }))
      .filter((op) => op.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [operators]);

  // 2. Transformación: Rendimiento Comparativo (Líneas)
  const rendimientoData = useMemo(() => {
    return operators
      .map((op: any) => ({
        // CORRECCIÓN TS: op as any temporalmente para leer los nuevos campos
        name: op.shortName || op.name,
        lectura: op.rendimiento_lectura || 0,
        real: op.rendimiento_real || 0,
      }))
      .filter((op) => op.lectura > 0 || op.real > 0);
  }, [operators]);

  // 3. Transformación: Incidencias
  const incidentsData = useMemo(() => {
    return operators
      .map((op) => ({
        name: op.shortName || op.name,
        incidencias: op.incidents || 0,
      }))
      .filter((op) => op.incidencias > 0)
      .sort((a, b) => b.incidencias - a.incidencias);
  }, [operators]);

  const handleViewDetail = (
    title: string,
    rawData: any[],
    valueKey: string,
    label: string,
  ) => {
    const formattedData = rawData.map((item) => ({
      name: item.name,
      value: item[valueKey],
      label: label,
    }));
    setModalConfig({ open: true, title, data: formattedData });
  };

  // Formateador de moneda
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Top Operadores por Ingresos (Barras) */}
        <Card
          ref={revenueRef}
          className="rounded-xl border shadow-none glass-card"
        >
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle>
              <ChartActionMenu
                title="Top Operadores (Ingresos)"
                data={revenueData}
                containerRef={revenueRef}
                onViewDetail={() =>
                  handleViewDetail(
                    "Ranking de Ingresos",
                    revenueData,
                    "ingresos",
                    "Total Facturado",
                  )
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientGreen"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(142, 76%, 45%)"
                        stopOpacity={1}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(142, 76%, 30%)"
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(val) =>
                      val.length > 12 ? `${val.substring(0, 10)}...` : val
                    }
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Facturado",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card) / 0.9)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar
                    dataKey="ingresos"
                    fill="url(#barGradientGreen)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Rendimiento Lectura vs Real (Líneas) */}
        <Card
          ref={rendimientoRef}
          className="rounded-xl border shadow-none glass-card"
        >
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle>
              <ChartActionMenu
                title="Eficiencia (Lectura vs Real)"
                data={rendimientoData}
                containerRef={rendimientoRef}
                onViewDetail={() =>
                  handleViewDetail(
                    "Rendimiento por Operador",
                    rendimientoData,
                    "real",
                    "KM/L Real",
                  )
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rendimientoData}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(val) =>
                      val.length > 12 ? `${val.substring(0, 10)}...` : val
                    }
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} km/l`,
                      name === "lectura" ? "Lectura (SM)" : "Real",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card) / 0.9)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Line
                    type="monotone"
                    dataKey="lectura"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Lectura"
                  />
                  <Line
                    type="monotone"
                    dataKey="real"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Real"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Incidencias */}
        <Card
          ref={incidentsRef}
          className="rounded-xl border shadow-none glass-card"
        >
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle>
              <ChartActionMenu
                title="Incidencias"
                data={incidentsData}
                containerRef={incidentsRef}
                onViewDetail={() =>
                  handleViewDetail(
                    "Reporte de Incidencias",
                    incidentsData,
                    "incidencias",
                    "Alertas",
                  )
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incidentsData}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientRed"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(0, 84%, 68%)"
                        stopOpacity={1}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(0, 84%, 50%)"
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(val) =>
                      val.length > 12 ? `${val.substring(0, 10)}...` : val
                    }
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Incidencias"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card) / 0.9)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar
                    dataKey="incidencias"
                    fill="url(#barGradientRed)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <ServiceDetailModal
        isOpen={modalConfig.open}
        onClose={() => setModalConfig({ ...modalConfig, open: false })}
        title={modalConfig.title}
        data={modalConfig.data}
      />
    </>
  );
}
