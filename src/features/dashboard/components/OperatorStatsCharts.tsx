import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperatorStats } from "@/features/dashboard/types";
import {
  getOperatorTripsData,
  getOperatorIncidentsData,
} from "@/features/dashboard/utils/dashboardUtils";
import { useMemo } from "react";

interface OperatorStatsChartsProps {
  operators: OperatorStats[];
}

export function OperatorStatsCharts({ operators }: OperatorStatsChartsProps) {
  const tripsData = getOperatorTripsData(operators);
  const incidentsData = getOperatorIncidentsData(operators);

  // Extraemos la info de rendimiento y la ordenamos de mayor a menor eficiencia
  const rendimientoData = useMemo(() => {
    return operators
      .map((op) => ({
        name: op.shortName || op.name,
        rendimiento: op.rendimiento || 0,
      }))
      .filter((op) => op.rendimiento > 0) // No mostramos a los que tienen 0
      .sort((a, b) => b.rendimiento - a.rendimiento);
  }, [operators]);

  return (
    // Cambiamos a lg:grid-cols-3 para acomodar las 3 gráficas
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {/* 1. Top Operadores por Viajes */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
            Top Operadores (Más Viajes)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tripsData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
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
                  tickFormatter={(value) =>
                    value.length > 12 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Viajes"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card) / 0.9)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "12px",
                  }}
                />
                <Bar
                  dataKey="viajes"
                  fill="url(#barGradientGreen)"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. NUEVA: Rendimiento de Combustible por Operador */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
            Eficiencia Combustible (Km/L)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rendimientoData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="barGradientBlue"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) =>
                    value.length > 12 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value} km/l`,
                    "Rendimiento",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card) / 0.9)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "12px",
                  }}
                />
                <Bar
                  dataKey="rendimiento"
                  fill="url(#barGradientBlue)"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Operadores con Más Incidencias */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
            Operadores (Más Incidencias)
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
                  tickFormatter={(value) =>
                    value.length > 12 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
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
  );
}
