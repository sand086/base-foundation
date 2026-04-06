/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { TariffStatus } from './TariffStatus';
import type { UnitType } from './UnitType';
export type TariffCreate = {
    nombre_ruta: string;
    tipo_unidad: UnitType;
    tarifa_base: number;
    costo_casetas?: number;
    moneda?: Currency;
    vigencia: string;
    estatus?: TariffStatus;
    distancia_km?: (number | null);
    iva_porcentaje?: (number | null);
    retencion_porcentaje?: (number | null);
    rate_template_id?: (number | null);
    id?: (number | null);
};

