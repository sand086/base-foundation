import { useState, useCallback, useEffect } from "react";
import axiosClient from "@/api/axiosClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Trip,
  TripCreatePayload,
  TripLegCreatePayload,
  TripTimelineEventCreatePayload,
} from "@/features/trips/types";

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   *  REFRESH MAESTRO
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
   *  DESENGANCHE / RELEVO (Etapa 2 y 3)
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
        description: "La fase ha sido asignada a la nueva unidad y operador.",
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
   * 📈 ACTUALIZAR ESTATUS OPERATIVO RÁPIDO
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
   * 📝 BITÁCORA Y FINALIZACIÓN (TIMELINE)
   * 🚀 CORRECCIÓN DE BUG "ATRAPADO EN TRÁNSITO": Forzamos refresh.
   */
  const addTimelineEvent = async (
    tripId: string | number,
    legId: string | number,
    data: TripTimelineEventCreatePayload, // 🚀 REEMPLAZAMOS EL TIPO INLINE POR EL OFICIAL
    silent: boolean = false,
  ) => {
    try {
      // 🚀 AGREGAMOS EL CAMPO NUEVO AL PAYLOAD QUE VIAJA AL BACKEND
      const payload = {
        trip_leg_id: legId,
        status: data.status,
        event:
          data.comments ||
          `Actualización: ${data.status.replace("_", " ").toUpperCase()}`,
        location: data.location || "Administración / Patio",
        lat: data.lat || null,
        lng: data.lng || null,
        notifyClient: data.notifyClient || false,
        terminal_entrega_vacio: data.terminal_entrega_vacio || null, // <-- ¡AQUÍ ESTÁ LA MAGIA!
        event_type: ["retraso", "accidente", "detenido"].includes(data.status)
          ? "alert"
          : "info",
      };

      await axiosClient.post(`/trips/${tripId}/timeline`, payload);

      if (!silent) {
        toast({
          title:
            data.status === "entregado"
              ? "Viaje Finalizado"
              : "Bitácora actualizada",
          description:
            data.status === "entregado"
              ? "Equipos liberados correctamente."
              : "El evento se guardó correctamente.",
        });
      }

      // 🚀 FORZAR REFRESH PARA QUE DESAPAREZCA DEL PIZARRÓN SIN F5
      await fetchTrips();
      return true;
    } catch (error) {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el estado del viaje.",
        });
      }
      return false;
    }
  };

  /**
   * 💰 OBTENER LIQUIDACIÓN PREVIA
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

  /**
   * 💰 CERRAR LIQUIDACIÓN (UNO POR UNO - LEGACY)
   */
  const closeTripSettlement = async (legId: string | number, payload: any) => {
    try {
      await axiosClient.post(`/trips/leg/${legId}/close-settlement`, payload);
      toast({
        title: "Tramo Liquidado",
        description: "Ciclo de fase cerrado y registrado en finanzas.",
      });
      await fetchTrips();
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
   *  REFRESH MANUAL
   */
  const refreshTrips = useCallback(async () => {
    await fetchTrips();
  }, [fetchTrips]);

  /**
   * 🚀 LIQUIDACIÓN POR LOTE
   */
  const liquidarLote = async (legIds: string[], neto_a_pagar: number) => {
    try {
      const response = await axiosClient.post("/trips/legs/settle-batch", {
        leg_ids: legIds.map(Number),
        neto_a_pagar,
      });
      await fetchTrips();
      return response.data;
    } catch (error) {
      console.error("Error al liquidar lote:", error);
      throw error;
    }
  };

  /**
   * 🚀 PRE-LIQUIDACIÓN POR LOTE (CÁLCULO DE DIÉSEL)
   */
  const getSettlementPreview = async (legIds: string[]) => {
    try {
      const response = await axiosClient.post(
        "/trips/legs/settlement-preview",
        { leg_ids: legIds.map(Number) },
      );
      return response.data;
    } catch (error) {
      console.error("Error al obtener la pre-liquidación:", error);
      throw error;
    }
  };

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
    liquidarLote,
    getSettlementPreview,
  };
};
