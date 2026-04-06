/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RateSegmentCreate } from './RateSegmentCreate';
import type { TollUnitType } from './TollUnitType';
export type RateTemplateCreate = {
    client_id?: (number | null);
    origen?: (string | null);
    destino?: (string | null);
    tipo_unidad: TollUnitType;
    costo_total_sencillo?: number;
    costo_total_full?: number;
    distancia_total_km?: number;
    tiempo_total_minutos?: number;
    segments?: Array<RateSegmentCreate>;
};

