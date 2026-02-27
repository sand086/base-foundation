// src/hooks/useTrips.ts
import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/api/axiosClient";
import { toast } from "sonner";
import { Trip, TripCreatePayload, TripStatus } from "@/types/api.types";

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get<Trip[]>("/despacho/trips"); // Ajusta la ruta a tu backend
      setTrips(response.data);
    } catch (error) {
      console.error("Error al cargar viajes", error);
      toast.error("No se pudieron cargar los viajes activos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const createTrip = async (payload: TripCreatePayload) => {
    try {
      await axiosClient.post("/despacho/trips", payload); // Ajusta la ruta a tu backend
      toast.success("¡Viaje despachado con éxito!");
      fetchTrips();
      return true;
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Error al despachar el viaje",
      );
      return false;
    }
  };

  const updateTripStatus = async (
    id: number,
    status: TripStatus,
    location?: string,
  ) => {
    try {
      await axiosClient.patch(`/despacho/trips/${id}/status`, null, {
        params: { status, location },
      });
      toast.success("Estatus de viaje actualizado");
      fetchTrips();
      return true;
    } catch (error) {
      toast.error("Error al actualizar estatus");
      return false;
    }
  };

  return {
    trips,
    isLoading,
    createTrip,
    updateTripStatus,
    refreshTrips: fetchTrips,
  };
};
