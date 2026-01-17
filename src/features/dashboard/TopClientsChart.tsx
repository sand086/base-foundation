import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientServiceCount, getTopClientsChartData } from "@/data/dashboardData";

interface TopClientsChartProps {
  clients: ClientServiceCount[];
}

export function TopClientsChart({ clients }: TopClientsChartProps) {
  const data = getTopClientsChartData(clients);

  return (
    <Card className="rounded border shadow-none">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-brand-dark">
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
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 9 }}
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
              />
              <Bar
                dataKey="servicios"
                fill="hsl(221, 83%, 53%)"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
