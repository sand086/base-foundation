import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OperatorStats,
  getOperatorTripsData,
  getOperatorIncidentsData,
} from "@/data/dashboardData";

interface OperatorStatsChartsProps {
  operators: OperatorStats[];
}

export function OperatorStatsCharts({ operators }: OperatorStatsChartsProps) {
  const tripsData = getOperatorTripsData(operators);
  const incidentsData = getOperatorIncidentsData(operators);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Top Operadores por Viajes */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
            Top Operadores (Más Viajes)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tripsData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <defs>
                  {/* Holographic gradient green */}
                  <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 45%)" stopOpacity={1} />
                    <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 30%)" stopOpacity={0.75} />
                  </linearGradient>
                  <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) =>
                    value.length > 10 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Viajes']}
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
                  dataKey="viajes"
                  fill="url(#barGradientGreen)"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  filter="url(#glowGreen)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Operadores con Más Incidencias */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark heading-crisp">
            Operadores (Más Incidencias)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incidentsData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <defs>
                  {/* Holographic gradient red */}
                  <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 68%)" stopOpacity={1} />
                    <stop offset="50%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.75} />
                  </linearGradient>
                  <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) =>
                    value.length > 10 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Incidencias']}
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
                  dataKey="incidencias"
                  fill="url(#barGradientRed)"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  filter="url(#glowRed)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
