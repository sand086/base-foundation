/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TripTimelineEventCreatePayload = {
    status: string;
    location: string;
    comments?: (string | null);
    lat?: (string | null);
    lng?: (string | null);
    notifyClient?: (boolean | null);
    odometro?: (number | null);
    odometro_final?: (number | null);
    combustible_porcentaje?: (number | null);
    combustible_litros?: (number | null);
    terminal_entrega_vacio?: (string | null);
    trip_leg_id?: (number | null);
    penalizacion_monto?: (number | null);
    penalizacion_motivo?: (string | null);
};

