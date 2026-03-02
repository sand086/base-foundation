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

  const addTimelineEvent = async (
    tripId: string,
    data: {
      status: string;
      location: string;
      comments: string;
      lat?: string;
      lng?: string;
      notifyClient?: boolean;
    },
  ) => {
    try {
      const payload = {
        status: data.status,
        event:
          data.comments ||
          `Actualización de estatus a ${data.status.replace("_", " ").toUpperCase()}`,
        location: data.location,
        lat: data.lat || null,
        lng: data.lng || null,
        notifyClient: data.notifyClient || false,
        event_type: ["retraso", "accidente", "detenido"].includes(data.status)
          ? "alert"
          : "checkpoint",
      };

      await axiosClient.post(`/trips/${tripId}/timeline`, payload);
      toast({
        title: "Bitácora actualizada",
        description: "El evento se guardó correctamente.",
      });
      await fetchTrips(); // 🔄 Recarga los viajes
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar en la bitácora.",
      });
      return false;
    }
  };

  const getTripSettlement = async (tripId: string) => {
    try {
      const response = await axiosClient.get(`/trips/${tripId}/settlement`);
      return response.data;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la liquidación de este viaje.",
      });
      return null;
    }
  };

  const closeTripSettlement = async (tripId: string, payload: any) => {
    try {
      await axiosClient.post(`/trips/${tripId}/close-settlement`, payload);
      toast({
        title: "Viaje Liquidado",
        description: "El viaje ha sido cerrado exitosamente.",
      });
      await fetchTrips(); // Recargamos para que el viaje pase a "Cerrado" en el tablero
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al liquidar",
        description: "Hubo un problema cerrando el viaje.",
      });
      return false;
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
    addTimelineEvent,
    getTripSettlement,
    closeTripSettlement,
  };
};
