/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TireEventType } from './TireEventType';
export type MaintenanceTirePayload = {
    tipo: TireEventType;
    costo?: number;
    descripcion?: (string | null);
    km?: number;
    responsable?: (string | null);
    posicion?: (string | null);
    unit_id?: (number | null);
};

