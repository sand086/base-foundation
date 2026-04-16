import { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientServiceCount } from "@/features/dashboard/types";
import { ChartActionMenu } from "@/components/ui/chart-action-menu";
import { ServiceDetailModal } from "./ServiceDetailModal";

interface TopClientsChartProps {
  clients: ClientServiceCount[];
}

export function TopClientsChart({ clients }: TopClientsChartProps) {
  // Procesamos los datos directamente aquí en pesos ($), sin depender de utils antiguos
  const data = useMemo(() => {
    return clients
      .map((c) => ({
        name: c.shortName || c.client,
        ingresos: c.revenue || 0, // Mapeamos la propiedad revenue del backend
      }))
      .filter((c) => c.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos); // Orden descendente de más a menos $
  }, [clients]);

  const chartRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formateador de moneda
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val);

  // Calculamos el alto de la gráfica según la cantidad de clientes (min 200px, o 40px por barra)
  const chartHeight = Math.max(200, data.length * 40);

  return (
    <>
      <Card
        ref={chartRef}
        className="rounded-xl border shadow-none glass-card h-full flex flex-col"
      >
        <CardHeader className="pb-2 pt-3 px-3 shrink-0">
          <CardTitle>
            {/* Menú de acciones integrado */}
            <ChartActionMenu
              title="Ingresos por Cliente (Mensual)" // Título ajustado a lo que pidió Gustavo
              data={data}
              containerRef={chartRef}
              onViewDetail={() => setIsModalOpen(true)}
            />
          </CardTitle>
        </CardHeader>
        {/* Aquí agregamos overflow-y-auto para que si son 30 clientes, haga scroll bonito */}
        <CardContent className="px-3 pb-3 flex-1 overflow-y-auto custom-scrollbar">
          <div style={{ height: chartHeight, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
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
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) =>
                    value.length > 18 ? `${value.substring(0, 15)}...` : value
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Ingresos",
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
                  dataKey="ingresos"
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

      {/* Modal de detalle para ver el listado de todos los clientes */}
      <ServiceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Desglose de Ingresos por Cliente"
        data={data.map((item) => ({
          name: item.name,
          value: formatCurrency(item.ingresos),
          label: "Total Facturado",
        }))}
      />
    </>
  );
}
