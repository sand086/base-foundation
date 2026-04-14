import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DefaultService } from "@/api/generated";
import { DashboardData } from "@/features/dashboard/types";

export function useDashboard(startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const formattedStart = startDate
          ? format(startDate, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd");
        const formattedEnd = endDate
          ? format(endDate, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd");

        const responseData =
          await DefaultService.getDashboardStatsApiDashboardStatsGet(
            formattedStart,
            formattedEnd,
          );

        setData(responseData);
      } catch (err: any) {
        if (err.name === "AbortError" || err.message === "canceled") return;
        setError(err.message || "Error al cargar los datos del dashboard");
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [startDate, endDate]);

  return {
    serviceStats: data?.serviceStats,
    clientServices: data?.clientServices,
    operatorStats: data?.operatorStats,
    recentServices: data?.recentServices,
    // Asegúrate de agregar estas 3 líneas en el return de tu hook:
    revenueTrend: data?.revenueTrend,
    tripConfigTrend: data?.tripConfigTrend,
    fuelTrend: data?.fuelTrend,
    isLoading,
    error,
  };
}
