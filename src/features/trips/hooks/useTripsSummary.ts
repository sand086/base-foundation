import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Trip } from "@/features/trips/types";
import { TRIPS_QUERY_KEY } from "@/features/trips/hooks/useTrips";

export interface TripsSummaryFilters {
  /** Estatus separados por coma, ej. "en_transito,entregado". */
  status?: string;
  client_id?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  /** Busca en folio, referencia, contenedores y ruta. */
  q?: string;
  limit?: number;
}

const NO_TRIPS: Trip[] = [];

/**
 * Viajes + tramos SIN bitácora, combustible, facturas ni operadores (GET /logistics/trips/summary).
 * Para selectores y validaciones. Si la pantalla necesita bitácora, facturas o cualquier otro
 * dato del detalle, usa useTrips().
 */
export const useTripsSummary = (filters: TripsSummaryFilters = {}) => {
  const query = useQuery({
    // Cuelga de ["trips"]: invalidar ese prefijo (como hace useTrips tras cada acción) refresca también el resumen.
    queryKey: [...TRIPS_QUERY_KEY, "summary", filters],
    queryFn: async () => {
      const res = await axiosClient.get("/api/logistics/trips/summary", {
        params: { limit: 5000, ...filters },
      });
      return res.data as Trip[];
    },
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    trips: query.data ?? NO_TRIPS,
    loading: query.isFetching,
    refetch: query.refetch,
  };
};
