import { useState, useCallback, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useToast } from "@/components/ui/use-toast";
import { Trip, TripCreatePayload } from "@/types/api.types";

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 🔍 EL SERVICIO GET: Trae los datos de la DB
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      // Si tu backend usa prefijo /api, asegúrate que axiosClient lo tenga
      // o cámbialo aquí a "/api/trips"
      const response = await axiosClient.get("/trips");
      console.log("Datos recibidos:", response.data); // Debug en consola
      setTrips(response.data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los viajes desde el servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 🚀 EL SERVICIO POST: Crea un nuevo viaje
  const createTrip = async (tripData: TripCreatePayload) => {
    try {
      const response = await axiosClient.post("/trips", tripData);
      toast({ title: "Éxito", description: "Viaje despachado correctamente" });
      await fetchTrips(); // Recargar la lista automáticamente
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail || "Error al crear despacho";
      toast({
        title: "Error",
        description:
          typeof detail === "string" ? detail : "Error de validación",
        variant: "destructive",
      });
      return null;
    }
  };

  // 🔄 EL SERVICIO PATCH: Actualiza el estatus (usado en el Drag & Drop)
  const updateTripStatus = async (
    id: string,
    status: string,
    location?: string,
  ) => {
    try {
      await axiosClient.patch(`/trips/${id}/status`, null, {
        params: { status, location },
      });
      // Actualización optimista local para que el Kanban sea fluido
      setTrips((prev) =>
        prev.map((t) =>
          String(t.id) === id ? { ...t, status: status as any } : t,
        ),
      );
      toast({ title: "Actualizado", description: `Viaje movido a ${status}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del viaje",
        variant: "destructive",
      });
      fetchTrips(); // Revertir cambios recargando desde el server
    }
  };

  const editTrip = async (id: string, tripData: Partial<Trip>) => {
    try {
      await axiosClient.put(`/trips/${id}`, tripData);
      toast({ title: "Éxito", description: "Viaje actualizado correctamente" });
      await fetchTrips(); // Recarga la info
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el viaje",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      await axiosClient.delete(`/trips/${id}`);
      toast({ title: "Eliminado", description: "El viaje ha sido borrado." });
      fetchTrips(); // Recarga la lista
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar.",
      });
    }
  };

  // Auto-arranque al cargar cualquier componente que use este hook
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    fetchTrips,
    createTrip,
    updateTripStatus,
    editTrip,
    deleteTrip,
  };
};
