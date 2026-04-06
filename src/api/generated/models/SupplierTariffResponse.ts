/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { RateTemplateResponse } from './RateTemplateResponse';
import type { TariffStatus } from './TariffStatus';
import type { UnitType } from './UnitType';
export type SupplierTariffResponse = {
    nombre_ruta: string;
    tipo_unidad: UnitType;
    tarifa_base: number;
    costo_casetas?: number;
    moneda?: Currency;
    vigencia: string;
    estatus?: TariffStatus;
    iva_porcentaje?: number;
    retencion_porcentaje?: number;
    rate_template_id?: (number | null);
    id: number;
    supplier_id: number;
    route_template?: (RateTemplateResponse | null);
    /**
     * Cálculo estandarizado: Subtotal + IVA - Retención
     */
    readonly total_flete: number;
};

