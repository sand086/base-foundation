import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceStats, getOnTimeVsLateData } from "@/data/dashboardData";

interface OnTimeChartProps {
  stats: ServiceStats;
}

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)'];

export function OnTimeChart({ stats }: OnTimeChartProps) {
  const data = getOnTimeVsLateData(stats);

  return (
    <Card className="rounded border shadow-none">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark">
          On-Time vs Tardíos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString('es-MX'),
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
