import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//  Importación actualizada al nuevo servicio
import {
  ClientServiceCount,
  getTopClientsChartData,
} from "@/services/dashboardService";

interface TopClientsChartProps {
  clients: ClientServiceCount[];
}

export function TopClientsChart({ clients }: TopClientsChartProps) {
  // Usamos el helper del servicio para transformar los datos brutos
  const data = getTopClientsChartData(clients);

  return (
    <Card className="rounded-xl border shadow-none glass-card h-full">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
          Servicios por Cliente (Top 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                {/* Holographic gradient for bars */}
                <linearGradient
                  id="barGradientBlue"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(221, 83%, 53%)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(221, 90%, 60%)"
                    stopOpacity={1}
                  />
                </linearGradient>
                {/* Glow filter */}
                <filter
                  id="barGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                type="number"
                hide // Escondemos el eje X para un look más limpio ya que tenemos tooltips
              />
              <YAxis
                dataKey="name"
                type="category"
                width={110} // Un poco más de ancho para nombres de clientes
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) =>
                  value.length > 18 ? `${value.substring(0, 15)}...` : value
                }
              />
              <Tooltip
                formatter={(value: number) => [
                  value.toLocaleString("es-MX"),
                  "Servicios",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card) / 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid hsl(0 0% 100% / 0.1)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
              />
              <Bar
                dataKey="servicios" // Coincide con el helper en dashboardService
                fill="url(#barGradientBlue)"
                radius={[0, 4, 4, 0]}
                barSize={16}
                filter="url(#barGlow)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
