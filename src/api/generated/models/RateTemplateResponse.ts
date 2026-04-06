/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientLite } from './ClientLite';
import type { RateSegmentResponse } from './RateSegmentResponse';
import type { RecordStatus } from './RecordStatus';
import type { TollUnitType } from './TollUnitType';
export type RateTemplateResponse = {
    client_id?: (number | null);
    origen?: (string | null);
    destino?: (string | null);
    tipo_unidad: TollUnitType;
    costo_total_sencillo?: number;
    costo_total_full?: number;
    distancia_total_km?: number;
    tiempo_total_minutos?: number;
    id: number;
    segments?: Array<RateSegmentResponse>;
    client?: (ClientLite | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

