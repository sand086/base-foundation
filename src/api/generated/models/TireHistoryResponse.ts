/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
import type { TireEventType } from './TireEventType';
export type TireHistoryResponse = {
    fecha?: (string | null);
    tipo: TireEventType;
    descripcion?: (string | null);
    unit_id?: (number | null);
    unidad_economico?: (string | null);
    posicion?: (number | null);
    km?: (number | null);
    costo?: (number | null);
    responsable?: (string | null);
    id: number;
    tire_id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

