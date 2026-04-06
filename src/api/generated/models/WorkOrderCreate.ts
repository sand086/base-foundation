/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorkOrderPartCreate } from './WorkOrderPartCreate';
export type WorkOrderCreate = {
    unit_id: number;
    mechanic_id?: (number | null);
    descripcion_problema: string;
    parts?: Array<WorkOrderPartCreate>;
    tipo_mantenimiento?: string;
    trip_id?: (number | null);
};

