// src/features/dashboard/components/DashboardTrends.tsx
import { useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/features/dashboard/types";
import { ChartActionMenu } from "@/components/ui/chart-action-menu"; // <-- Importamos el menú

interface DashboardTrendsProps {
  data: DashboardData;
}

export function DashboardTrends({ data }: DashboardTrendsProps) {
  // 1. Creamos las referencias para exportar las gráficas como imagen/PDF
  const revenueRef = useRef<HTMLDivElement>(null);
  const tripConfigRef = useRef<HTMLDivElement>(null);
  const fuelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
      {/* 1. GRÁFICA DE INGRESOS MENSUALES (Area Chart) */}
      <Card
        ref={revenueRef}
        className="col-span-1 lg:col-span-2 rounded-2xl shadow-sm border-slate-100"
      >
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle>
            {/* 2. Reemplazamos el texto por el menú de acciones */}
            <ChartActionMenu
              title="Evolución de Ingresos"
              data={data.revenueTrend}
              containerRef={revenueRef}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.revenueTrend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  labelStyle={{ fontWeight: "bold", color: "#334155" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. GRÁFICA DE VIAJES FULL VS SENCILLO (Stacked Bar Chart) */}
      <Card
        ref={tripConfigRef}
        className="rounded-2xl shadow-sm border-slate-100"
      >
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle>
            <ChartActionMenu
              title="Volumen: Full vs Sencillo"
              data={data.tripConfigTrend}
              containerRef={tripConfigRef}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.tripConfigTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar
                  dataKey="fullCount"
                  name="Full"
                  stackId="a"
                  fill="#1e293b"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="sencilloCount"
                  name="Sencillo"
                  stackId="a"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. GRÁFICA DE COMBUSTIBLE (Combo Chart: Barras + Línea) */}
      <Card ref={fuelRef} className="rounded-2xl shadow-sm border-slate-100">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle>
            <ChartActionMenu
              title="Consumo vs Rendimiento"
              data={data.fuelTrend}
              containerRef={fuelRef}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data.fuelTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {/* Litros en barras azules */}
                <Bar
                  yAxisId="left"
                  dataKey="liters"
                  name="Litros Consumidos"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
                {/* Rendimiento en una línea naranja o roja para resaltar */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rendimiento"
                  name="Rendimiento (Km/L)"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#f59e0b",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
