import { useState, useCallback, useEffect } from "react";
import { LogisticsService } from "@/api/generated";
import { ApiError } from "@/api/generated/core/ApiError";
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

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      // ❄️ CIRUGÍA AQUÍ: Pasamos skip = 0, y limit = 5000 para evitar que la API trunque a 100
      const data = await LogisticsService.readTripsApiLogisticsTripsGet(
        0,
        5000,
      );
      setTrips(data as Trip[]);
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

  const createTrip = async (tripData: TripCreatePayload) => {
    try {
      const data = await LogisticsService.createTripApiLogisticsTripsPost(
        tripData as any,
      );
      toast({ title: "Éxito", description: "Viaje despachado correctamente" });
      await fetchTrips();
      return data;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al crear Dispatch";
      toast({
        title: "Error",
        description: msg || "Error al crear Dispatch",
        variant: "destructive",
      });
      return null;
    }
  };

  const createNextLeg = async (
    tripId: string | number,
    legData: TripLegCreatePayload,
  ) => {
    try {
      const data =
        await LogisticsService.createNextLegEndpointApiLogisticsTripsTripIdNextLegPost(
          Number(tripId),
          legData as any,
        );
      toast({
        title: "Relevo Exitoso",
        description: "La fase ha sido asignada a la nueva unidad y operador.",
      });
      await fetchTrips();
      return data;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "No se pudo realizar el relevo.";
      toast({
        title: "Error",
        description: msg || "No se pudo realizar el relevo.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTripStatus = async (
    id: string | number,
    status: string,
    location?: string,
  ) => {
    try {
      await LogisticsService.updateStatusApiLogisticsTripsTripIdStatusPatch(
        Number(id),
        status,
        location,
      );
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

  const editTrip = async (id: string | number, tripData: Partial<Trip>) => {
    try {
      await LogisticsService.updateTripEndpointApiLogisticsTripsTripIdPut(
        Number(id),
        tripData as any,
      );
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

  const deleteTrip = async (id: string | number) => {
    try {
      await LogisticsService.deleteTripEndpointApiLogisticsTripsTripIdDelete(
        String(id),
      );
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

  const undoTripLeg = async (tripId: string | number) => {
    try {
      const data =
        await LogisticsService.undoTripLegEndpointApiLogisticsTripsTripIdUndoLegPost(
          Number(tripId),
        );
      toast({
        title: "Movimiento Deshecho",
        description:
          "Se regresó el viaje a la fase anterior y se liberaron los equipos.",
      });
      await fetchTrips();
      return data;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : "Error al deshacer la fase.";
      toast({
        title: "Error",
        description: msg || "Error al deshacer la fase.",
        variant: "destructive",
      });
      return null;
    }
  };

  const addTimelineEvent = async (
    tripId: string | number,
    legId: string | number,
    data: TripTimelineEventCreatePayload,
    silent: boolean = false,
  ) => {
    try {
      const payload = {
        trip_leg_id: Number(legId),
        status: data.status,
        event:
          data.comments ||
          `Actualización: ${data.status.replace("_", " ").toUpperCase()}`,
        location: data.location || "Administración / Patio",
        lat: data.lat || null,
        lng: data.lng || null,
        notifyClient: data.notifyClient || false,
        terminal_entrega_vacio: data.terminal_entrega_vacio || null,
        event_type: ["retraso", "accidente", "detenido"].includes(data.status)
          ? "alert"
          : "info",
      } as any;

      await LogisticsService.createTimelineEventApiLogisticsTripsTripIdTimelinePost(
        Number(tripId),
        payload,
      );

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

  const getTripSettlement = async (legId: string | number) => {
    try {
      return await LogisticsService.getTripSettlementApiLogisticsTripsLegTripLegIdSettlementGet(
        Number(legId),
      );
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
      await LogisticsService.closeTripSettlementApiLogisticsTripsLegTripLegIdCloseSettlementPost(
        Number(legId),
        payload,
      );
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

  const refreshTrips = useCallback(async () => {
    await fetchTrips();
  }, [fetchTrips]);

  const liquidarLote = async (legIds: string[], neto_a_pagar: number) => {
    try {
      const response =
        await LogisticsService.settleTripLegsBatchApiLogisticsTripsLegsSettleBatchPost(
          {
            leg_ids: legIds.map(Number),
            neto_a_pagar,
          },
        );
      await fetchTrips();
      return response;
    } catch (error) {
      console.error("Error al liquidar lote:", error);
      throw error;
    }
  };

  const getSettlementPreview = async (legIds: string[]) => {
    try {
      return await LogisticsService.previewBatchSettlementEndpointApiLogisticsTripsLegsSettlementPreviewPost(
        {
          leg_ids: legIds.map(Number),
        },
      );
    } catch (error) {
      console.error("Error al obtener la pre-liquidación:", error);
      throw error;
    }
  };

  const unhookTrip = async (tripId: string) => {
    try {
      setLoading(true);
      await LogisticsService.unhookTripInYardApiLogisticsTripsTripIdUnhookPost(
        Number(tripId),
      );

      toast({
        title: "Desenganche Exitoso",
        description:
          "El operador y el tractocamión están libres. La carga espera en patio.",
      });

      await fetchTrips();
      return true;
    } catch (error: any) {
      const errorMsg =
        error.body?.detail ||
        error.message ||
        "No se pudo desenganchar el viaje.";
      toast({
        title: "Error al desenganchar",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    unhookTrip,
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
    undoTripLeg,
  };
};
