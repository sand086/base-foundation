/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FuelDocumentResponse } from './FuelDocumentResponse';
import type { OperatorFuelInfo } from './OperatorFuelInfo';
import type { RecordStatus } from './RecordStatus';
import type { UnitFuelInfo } from './UnitFuelInfo';
import type { UserFuelInfo } from './UserFuelInfo';
export type FuelLogResponse = {
    unit_id: number;
    operator_id: number;
    trip_leg_id?: (number | null);
    estacion: string;
    tipo_combustible: string;
    litros: number;
    precio_por_litro: number;
    total: number;
    odometro: number;
    id: number;
    fecha_hora: string;
    evidencia_url?: (string | null);
    excede_tanque: boolean;
    capacidad_tanque_snapshot?: (number | null);
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
    trip_id?: (number | null);
    unit?: (UnitFuelInfo | null);
    operator?: (OperatorFuelInfo | null);
    created_by?: (UserFuelInfo | null);
    document_history?: Array<FuelDocumentResponse>;
    readonly precioPorLitro: number;
    readonly unidadNumero: string;
    readonly operadorNombre: string;
    readonly registradoPor: string;
};

