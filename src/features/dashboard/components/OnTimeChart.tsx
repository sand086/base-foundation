import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//  Cambiamos la importación a la nueva ubicación del servicio
import { ServiceStats, getOnTimeVsLateData } from "@/services/dashboardService";

interface OnTimeChartProps {
  stats: ServiceStats;
}

// Colores consistentes con tu branding: Verde para éxito, Rojo para retrasos
const COLORS = ["hsl(142, 76%, 36%)", "hsl(0, 84%, 60%)"];

export function OnTimeChart({ stats }: OnTimeChartProps) {
  // Obtenemos los datos formateados usando el helper del servicio
  const data = getOnTimeVsLateData(stats);

  return (
    <Card className="rounded-xl border shadow-none glass-card h-full">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
          On-Time vs Tardíos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Filtro de resplandor para éxito */}
                <filter
                  id="glowSuccess"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Filtro de resplandor para peligro */}
                <filter
                  id="glowDanger"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55} // Un poco más grande para que se vea mejor el centro
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                // Mostramos el porcentaje directamente en la rebanada
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    filter={
                      index === 0 ? "url(#glowSuccess)" : "url(#glowDanger)"
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString("es-MX")} servicios`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card) / 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid hsl(0 0% 100% / 0.1)",
                  borderRadius: "12px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-medium text-muted-foreground">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
