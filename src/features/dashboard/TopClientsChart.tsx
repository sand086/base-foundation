import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientServiceCount, getTopClientsChartData } from "@/data/dashboardData";

interface TopClientsChartProps {
  clients: ClientServiceCount[];
}

export function TopClientsChart({ clients }: TopClientsChartProps) {
  const data = getTopClientsChartData(clients);

  return (
    <Card className="rounded-xl border shadow-none glass-card">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
          Servicios por Cliente (Top 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                {/* Holographic gradient for bars */}
                <linearGradient id="barGradientBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.9} />
                  <stop offset="50%" stopColor="hsl(221, 90%, 60%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.85} />
                </linearGradient>
                {/* Glow filter */}
                <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) =>
                  value.length > 15 ? `${value.substring(0, 15)}...` : value
                }
              />
              <Tooltip
                formatter={(value: number) => [
                  value.toLocaleString('es-MX'),
                  'Servicios',
                ]}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card) / 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid hsl(0 0% 100% / 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px hsl(0 0% 0% / 0.2)',
                }}
              />
              <Bar
                dataKey="servicios"
                fill="url(#barGradientBlue)"
                radius={[0, 6, 6, 0]}
                barSize={18}
                filter="url(#barGlow)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
