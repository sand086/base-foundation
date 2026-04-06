/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Body_create_fuel_log_api_fleet_fuel_logs_post = {
    unit_id: number;
    operator_id: number;
    trip_id?: (number | null);
    trip_leg_id?: (number | null);
    fecha_hora: string;
    estacion?: string;
    litros_diesel?: number;
    precio_diesel?: number;
    litros_urea?: number;
    precio_urea?: number;
    odometro?: number;
    file?: Blob;
};

