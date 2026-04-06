/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
import type { TireResponse } from './TireResponse';
import type { UnitStatus } from './UnitStatus';
export type UnitResponse = {
    public_id: string;
    numero_economico: string;
    placas: string;
    vin?: (string | null);
    marca: string;
    modelo: string;
    year?: (number | null);
    tipo?: (string | null);
    tipo_1?: (string | null);
    tipo_carga?: (string | null);
    numero_serie_motor?: (string | null);
    marca_motor?: (string | null);
    capacidad_carga?: (number | null);
    status?: UnitStatus;
    razon_bloqueo?: (string | null);
    ignore_blocking?: boolean;
    documentos_vencidos?: number;
    llantas_criticas?: number;
    is_loaded?: boolean;
    seguro_vence?: (string | null);
    verificacion_humo_vence?: (string | null);
    verificacion_fisico_mecanica_vence?: (string | null);
    verificacion_vence?: (string | null);
    permiso_sct_vence?: (string | null);
    permiso_sct_folio?: (string | null);
    caat_folio?: (string | null);
    caat_vence?: (string | null);
    tarjeta_circulacion_url?: (string | null);
    permiso_doble_articulado_url?: (string | null);
    poliza_seguro_url?: (string | null);
    verificacion_humo_url?: (string | null);
    verificacion_fisico_mecanica_url?: (string | null);
    permiso_sct_url?: (string | null);
    caat_url?: (string | null);
    tarjeta_circulacion_folio?: (string | null);
    id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
    tires?: Array<TireResponse>;
};

