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
    <Card className="rounded-xl border shadow-none glass-card">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
          On-Time vs Tardíos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Holographic glow filter for success */}
                <filter id="glowSuccess" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                {/* Holographic glow filter for danger */}
                <filter id="glowDanger" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    filter={index === 0 ? "url(#glowSuccess)" : "url(#glowDanger)"}
                    style={{ filter: `drop-shadow(0 0 6px ${COLORS[index % COLORS.length]})` }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString('es-MX'),
                  name,
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card) / 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid hsl(0 0% 100% / 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px hsl(0 0% 0% / 0.2)',
                }}
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
