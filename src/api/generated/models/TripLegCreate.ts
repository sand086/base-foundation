/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TripLegType } from './TripLegType';
import type { TripStatus } from './TripStatus';
/**
 * Schema para crear un tramo, generalmente desde la creación del Viaje o después.
 */
export type TripLegCreate = {
    leg_type: TripLegType;
    status?: TripStatus;
    unit_id?: (number | null);
    operator_id?: (number | null);
    anticipo_casetas?: number;
    anticipo_viaticos?: number;
    anticipo_combustible?: number;
    otros_anticipos?: number;
    monto_sueldo?: number;
    monto_bonos?: number;
    monto_maniobras?: number;
    monto_penalizaciones?: number;
    monto_neto_pagado?: number;
    odometro_inicial?: (number | null);
    nivel_tanque_inicial?: (number | null);
    odometro_final?: (number | null);
    rendimiento_real?: (number | null);
    start_date?: (string | null);
    actual_arrival?: (string | null);
    last_location?: (string | null);
};

