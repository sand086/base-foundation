// src/features/dashboard/components/CostsByCecoChart.tsx
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PieChart as PieChartIcon, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axiosClient from "@/api/axiosClient";

// Paleta de colores elegante y moderna para los CECOs
const COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#64748b",
];

interface CecoData {
  name: string;
  value: number;
}

export function CostsByCecoChart() {
  const [data, setData] = useState<CecoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCecoData = async () => {
      try {
        setIsLoading(true);
        // Llamamos al endpoint del TICKET 4 que creamos en el backend
        const response = await axiosClient.get(
          "/api/dashboard/stats/costs-by-ceco",
        );
        setData(response.data);
        setError(false);
      } catch (err) {
        console.error("Error cargando CECOs:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCecoData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-white/10 shadow-xl rounded-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            {payload[0].name}
          </p>
          <p className="font-mono font-black text-brand-navy dark:text-white text-lg">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full shadow-sm border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-white/5 mb-4">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-blue-500" />
          Gastos por Centro de Costo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest">
              Cargando desglose...
            </p>
          </div>
        ) : error ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-rose-400 gap-3">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs font-bold uppercase tracking-widest">
              Error al cargar datos
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-3">
            <PieChartIcon className="h-8 w-8 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">
              Sin gastos registrados
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
