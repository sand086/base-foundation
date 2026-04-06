/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Currency } from './Currency';
import type { TariffStatus } from './TariffStatus';
import type { UnitType } from './UnitType';
export type SupplierTariffUpdate = {
    nombre_ruta?: (string | null);
    tipo_unidad?: (UnitType | null);
    tarifa_base?: (number | null);
    costo_casetas?: (number | null);
    moneda?: (Currency | null);
    vigencia?: (string | null);
    estatus?: (TariffStatus | null);
};

