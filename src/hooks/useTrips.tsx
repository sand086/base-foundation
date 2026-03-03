// src/hooks/useTrips.ts
import { useState, useCallback, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Trip,
  TripCreatePayload,
  TripLegCreatePayload,
} from "@/types/api.types";

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/trips");
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

  const createTrip = async (tripData: TripCreatePayload) => {
    try {
      const response = await axiosClient.post("/trips", tripData);
      toast({ title: "Éxito", description: "Viaje despachado correctamente" });
      await fetchTrips();
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

  // 🚀 NUEVA FUNCIÓN: DESENGANCHAR Y CREAR SIGUIENTE TRAMO
  const createNextLeg = async (
    tripId: string,
    legData: TripLegCreatePayload,
  ) => {
    try {
      const response = await axiosClient.post(
        `/trips/${tripId}/next-leg`,
        legData,
      );
      toast({
        title: "Relevo Exitoso",
        description: "El remolque ha sido asignado a la nueva unidad.",
      });
      await fetchTrips();
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail || "Error al hacer el relevo";
      toast({
        title: "Error",
        description:
          typeof detail === "string"
            ? detail
            : "No se pudo realizar el desenganche.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTripStatus = async (
    id: string,
    status: string,
    location?: string,
  ) => {
    try {
      await axiosClient.patch(`/trips/${id}/status`, null, {
        params: { status, location },
      });
      toast({
        title: "Actualizado",
        description: `Viaje movido a ${status.replace("_", " ")}`,
      });
      fetchTrips(); // Refrescamos todo para no fallar con los tramos anidados
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del viaje",
        variant: "destructive",
      });
      fetchTrips();
    }
  };

  const editTrip = async (id: string, tripData: Partial<Trip>) => {
    try {
      await axiosClient.put(`/trips/${id}`, tripData);
      toast({ title: "Éxito", description: "Viaje actualizado correctamente" });
      await fetchTrips();
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
      fetchTrips();
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
      await fetchTrips();
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

  //  Las URLs de liquidación ahora apuntan a /leg/
  const getTripSettlement = async (legId: string) => {
    try {
      const response = await axiosClient.get(`/trips/leg/${legId}/settlement`);
      return response.data;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la liquidación de este tramo.",
      });
      return null;
    }
  };

  

  const closeTripSettlement = async (legId: string, payload: any) => {
    try {
      await axiosClient.post(`/trips/leg/${legId}/close-settlement`, payload);
      toast({
        title: "Tramo Liquidado",
        description: "El pago del operador ha sido cerrado exitosamente.",
      });
      await fetchTrips();
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al liquidar",
        description: "Hubo un problema cerrando el tramo.",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    fetchTrips,
    createTrip,
    createNextLeg, // <- Nueva función expuesta
    updateTripStatus,
    editTrip,
    deleteTrip,
    addTimelineEvent,
    getTripSettlement,
    closeTripSettlement,
  };
};
