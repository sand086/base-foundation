/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FuelLogLite } from './FuelLogLite';
import type { OperatorResponse } from './OperatorResponse';
import type { RecordStatus } from './RecordStatus';
import type { TripLegType } from './TripLegType';
import type { TripStatus } from './TripStatus';
import type { TripTimelineEventResponse } from './TripTimelineEventResponse';
import type { UnitResponse } from './UnitResponse';
export type TripLegResponse = {
    leg_type: TripLegType;
    status?: TripStatus;
    unit_id?: (number | null);
    operator_id?: (number | null);
    anticipo_casetas?: number;
    anticipo_viaticos?: number;
    anticipo_combustible?: number;
    otros_anticipos?: number;
    monto_sueldo?: number;
    monto_bonos?: number;
    monto_maniobras?: number;
    monto_penalizaciones?: number;
    monto_neto_pagado?: number;
    desglose_conceptos?: null;
    odometro_inicial?: (number | null);
    nivel_tanque_inicial?: (number | null);
    odometro_final?: (number | null);
    rendimiento_real?: (number | null);
    start_date?: (string | null);
    actual_arrival?: (string | null);
    last_location?: (string | null);
    id: number;
    trip_id: number;
    last_update?: (string | null);
    unit?: (UnitResponse | null);
    operator?: (OperatorResponse | null);
    timeline_events?: Array<TripTimelineEventResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    fuel_logs?: Array<FuelLogLite>;
    readonly total_anticipos: number;
};

