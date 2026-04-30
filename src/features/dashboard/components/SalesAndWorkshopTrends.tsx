import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle } from "lucide-react"; // Añadido para el mensaje de estado vacío

// Tipos temporales (mientras regeneras tu OpenAPI)
interface DailyRevenue {
  day: string;
  revenue: number;
  meta: number;
}

interface MechanicStats {
  mechanic_name: string;
  ordenes_cerradas: number;
  gasto_total: number;
}

interface SalesAndWorkshopProps {
  dailyRevenue?: DailyRevenue[];
  mechanicStats?: MechanicStats[];
}

export function SalesAndWorkshopTrends({
  dailyRevenue = [],
  mechanicStats = [],
}: SalesAndWorkshopProps) {
  // Formateador de moneda (ej: $15,000.00)
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val);

  // Formateador compacto para etiquetas (ej: $15k) para no saturar la gráfica
  const formatCompactCurrency = (val: number) => `$${(val / 1000).toFixed(1)}k`;

  // Formateador de fechas para el Eje X (ej: "14 abr")
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-6">
      {/* 1. GRÁFICA DE VENTAS DIARIAS VS META */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ventas Diarias vs Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[250px] flex items-center justify-center">
            {dailyRevenue.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <AlertCircle className="h-6 w-6 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">
                  No hay ventas en el periodo
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyRevenue}
                  margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientSales"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop
                        offset="100%"
                        stopColor="#1d4ed8"
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border)/0.5)"
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDate}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickMargin={10}
                  />
                  <YAxis
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card) / 0.95)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />

                  <Bar
                    dataKey="revenue"
                    name="Venta Real ($)"
                    fill="url(#barGradientSales)"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Line
                    type="step"
                    dataKey="meta"
                    name="Meta Diaria ($)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. RENDIMIENTO DE TALLER: ÓRDENES VS GASTO */}
      <Card className="rounded-xl border shadow-none glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Taller: Órdenes Cerradas vs Gasto
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[250px] flex items-center justify-center">
            {mechanicStats.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <AlertCircle className="h-6 w-6 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">
                  No hay órdenes cerradas
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={mechanicStats}
                  layout="vertical"
                  margin={{ top: 10, right: 60, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientWorkshop"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  <XAxis type="number" xAxisId="bottom" hide />
                  <XAxis type="number" xAxisId="top" orientation="top" hide />

                  <YAxis
                    dataKey="mechanic_name"
                    type="category"
                    width={90}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />

                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name.includes("$")
                        ? formatCurrency(value)
                        : `${value} órdenes`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card) / 0.95)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />

                  <Bar
                    xAxisId="bottom"
                    dataKey="ordenes_cerradas"
                    name="Órdenes (Cantidad)"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    <LabelList
                      dataKey="ordenes_cerradas"
                      position="right"
                      style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        fill: "#10b981",
                      }}
                    />
                  </Bar>

                  <Bar
                    xAxisId="top"
                    dataKey="gasto_total"
                    name="Gasto Refacciones ($)"
                    fill="url(#barGradientWorkshop)"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    <LabelList
                      dataKey="gasto_total"
                      position="right"
                      formatter={formatCompactCurrency}
                      style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        fill: "#8b5cf6",
                      }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
