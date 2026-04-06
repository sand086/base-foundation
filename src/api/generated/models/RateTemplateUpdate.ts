/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RateSegmentUpdate } from './RateSegmentUpdate';
import type { TollUnitType } from './TollUnitType';
export type RateTemplateUpdate = {
    origen?: (string | null);
    destino?: (string | null);
    tipo_unidad?: (TollUnitType | null);
    costo_total_sencillo?: (number | null);
    costo_total_full?: (number | null);
    distancia_total_km?: (number | null);
    tiempo_total_minutos?: (number | null);
    segments?: (Array<RateSegmentUpdate> | null);
};

