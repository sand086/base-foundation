import { useState, useEffect } from "react";
import { format } from "date-fns";
import { dashboardService, DashboardData } from "@/services/dashboardService";

export function useDashboard(startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    //   Controlador para cancelar peticiones si el usuario cambia la fecha rápido
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Opcional: setData(null); // Descomenta si prefieres limpiar los gráficos al cargar
        setError(null);

        const formattedStart = startDate
          ? format(startDate, "yyyy-MM-dd")
          : undefined;
        const formattedEnd = endDate
          ? format(endDate, "yyyy-MM-dd")
          : undefined;

        const responseData = await dashboardService.getStats(
          formattedStart,
          formattedEnd,
          // Aquí podrías pasar { signal: controller.signal } si tu axios lo soporta
        );

        setData(responseData);
      } catch (err: any) {
        // No marcamos error si la petición fue cancelada intencionalmente
        if (err.name === "AbortError" || err.message === "canceled") return;

        setError(err.message || "Error al cargar los datos del dashboard");
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // 🧹 Limpieza: cancela la petición si el componente se desmonta o cambian las fechas
    return () => controller.abort();
  }, [startDate, endDate]);

  return {
    // Usamos encadenamiento opcional y valores por defecto para evitar errores en las gráficas
    serviceStats: data?.serviceStats,
    clientServices: data?.clientServices ?? [],
    operatorStats: data?.operatorStats ?? [],
    recentServices: data?.recentServices ?? [],
    isLoading,
    error,
  };
}
