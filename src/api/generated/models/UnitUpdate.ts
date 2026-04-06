/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UnitStatus } from './UnitStatus';
export type UnitUpdate = {
    public_id?: (string | null);
    numero_economico?: (string | null);
    placas?: (string | null);
    vin?: (string | null);
    marca?: (string | null);
    modelo?: (string | null);
    year?: (number | null);
    tipo?: (string | null);
    tipo_1?: (string | null);
    tipo_carga?: (string | null);
    numero_serie_motor?: (string | null);
    marca_motor?: (string | null);
    capacidad_carga?: (number | null);
    is_loaded?: (boolean | null);
    status?: (UnitStatus | null);
    razon_bloqueo?: (string | null);
    ignore_blocking?: (boolean | null);
    documentos_vencidos?: (number | null);
    llantas_criticas?: (number | null);
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
};

