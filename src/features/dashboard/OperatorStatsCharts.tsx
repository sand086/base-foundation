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
      <Card className="rounded border shadow-none">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark">
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
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(value) =>
                    value.length > 10 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Viajes']}
                  labelFormatter={(label) => label}
                />
                <Bar
                  dataKey="viajes"
                  fill="hsl(142, 76%, 36%)"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Operadores con Más Incidencias */}
      <Card className="rounded border shadow-none">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-brand-dark">
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
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(value) =>
                    value.length > 10 ? `${value.substring(0, 10)}...` : value
                  }
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Incidencias']}
                  labelFormatter={(label) => label}
                />
                <Bar
                  dataKey="incidencias"
                  fill="hsl(0, 84%, 60%)"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
