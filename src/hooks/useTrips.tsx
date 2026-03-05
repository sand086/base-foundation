// src/hooks/useTrips.tsx
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

  /**
   * 🔄 REFRESH MAESTRO
   * Trae la lista actualizada de viajes y sus tramos.
   */
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/trips");
      setTrips(response.data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Error de Sincronización",
        description: "No se pudieron cargar los viajes. Verifica tu conexión.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 🚀 INICIO DEL CICLO (Etapa 1: Carga)
   * Crea el viaje raíz y su primer tramo.
   */
  const createTrip = async (tripData: TripCreatePayload) => {
    try {
      const response = await axiosClient.post("/trips", tripData);
      toast({ title: "Éxito", description: "Viaje despachado correctamente" });
      await fetchTrips(); // Actualiza la UI
      return response.data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Error al crear despacho",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * 🔄 DESENGANCHE / RELEVO (Etapa 2 y 3)
   * Registra el "Drop" de un tractor y crea la siguiente fase para otro recurso.
   */
  const createNextLeg = async (
    tripId: string | number,
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
      await fetchTrips(); // Mueve el viaje en el Pizarrón
      return response.data;
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.detail || "No se pudo realizar el desenganche.",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * 📈 ACTUALIZAR ESTATUS OPERATIVO
   * Cambia el estado del viaje (en_transito, entregado, etc.)
   */
  const updateTripStatus = async (
    id: string | number,
    status: string,
    location?: string,
  ) => {
    try {
      await axiosClient.patch(`/trips/${id}/status`, null, {
        params: { status, location },
      });
      toast({
        title: "Estatus Actualizado",
        description: `Viaje movido a ${status.replace("_", " ").toUpperCase()}`,
      });
      await fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del viaje",
        variant: "destructive",
      });
    }
  };

  /**
   * 🛠️ EDITAR DATOS MAESTROS
   * Útil para ajustar finanzas (Tarifa Base/Casetas) desde el Centro de Mando.
   */
  const editTrip = async (id: string | number, tripData: Partial<Trip>) => {
    try {
      await axiosClient.put(`/trips/${id}`, tripData);
      toast({
        title: "Éxito",
        description: "Datos actualizados correctamente",
      });
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

  /**
   * 🗑️ ELIMINACIÓN TOTAL
   * Borra el viaje y todos sus tramos/fases.
   */
  const deleteTrip = async (id: string | number) => {
    try {
      await axiosClient.delete(`/trips/${id}`);
      toast({
        title: "Viaje Eliminado",
        description: "El registro ha sido borrado del sistema.",
      });
      await fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el viaje.",
        variant: "destructive",
      });
    }
  };

  /**
   * 📝 BITÁCORA (TIMELINE)
   * Agrega eventos de rastreo o incidencias a la fase actual.
   */
  const addTimelineEvent = async (
    tripId: string | number,
    legId: string | number,
    data: {
      status: string;
      location: string;
      comments: string;
      lat?: string;
      lng?: string;
      notifyClient?: boolean;
    },
    silent: boolean = false,
  ) => {
    try {
      const payload = {
        trip_leg_id: legId, // Vínculo estricto al tramo actual
        status: data.status,
        event:
          data.comments ||
          `Actualización: ${data.status.replace("_", " ").toUpperCase()}`,
        location: data.location || "Administración / Patio",
        lat: data.lat || null,
        lng: data.lng || null,
        notifyClient: data.notifyClient || false,
        event_type: ["retraso", "accidente", "detenido"].includes(data.status)
          ? "alert"
          : "info",
      };

      await axiosClient.post(`/trips/${tripId}/timeline`, payload);

      if (!silent) {
        toast({
          title: "Bitácora actualizada",
          description: "El evento se guardó correctamente.",
        });
      }
      await fetchTrips();
      return true;
    } catch (error) {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar en la bitácora.",
        });
      }
      return false;
    }
  };

  /**
   * 💰 LIQUIDACIÓN Y CIERRE (El paso final de Gustavo)
   * Al liquidar el último tramo ("entrega_vacio"), el sistema cierra el viaje y factura.
   */
  const getTripSettlement = async (legId: string | number) => {
    try {
      const response = await axiosClient.get(`/trips/leg/${legId}/settlement`);
      return response.data;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la liquidación del tramo.",
        variant: "destructive",
      });
      return null;
    }
  };

  const closeTripSettlement = async (legId: string | number, payload: any) => {
    try {
      await axiosClient.post(`/trips/leg/${legId}/close-settlement`, payload);
      toast({
        title: "Tramo Liquidado",
        description: "Ciclo de fase cerrado y registrado en finanzas.",
      });
      await fetchTrips(); // 🔄 Este es el que hace que el viaje desaparezca del planeador si ya terminó todo
      return true;
    } catch (error) {
      toast({
        title: "Error al liquidar",
        description: "Hubo un problema cerrando el tramo.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * 🔄 REFRESH MANUAL
   */
  const refreshTrips = useCallback(async () => {
    await fetchTrips();
  }, [fetchTrips]);

  // Carga inicial al montar el hook
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    fetchTrips,
    createTrip,
    createNextLeg,
    updateTripStatus,
    editTrip,
    deleteTrip,
    addTimelineEvent,
    getTripSettlement,
    closeTripSettlement,
    refreshTrips,
  };
};
