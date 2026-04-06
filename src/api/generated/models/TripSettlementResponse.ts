/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConceptoPago } from './ConceptoPago';
export type TripSettlementResponse = {
    viajeId: string;
    legId: number;
    operadorNombre: string;
    unidadNumero: string;
    ruta: string;
    fechaViaje: string;
    kmsRecorridos: number;
    estatus: string;
    conceptos: Array<ConceptoPago>;
    total_ingresos: number;
    total_deducciones: number;
    neto_a_pagar: number;
    consumoEsperadoLitros: number;
    consumoRealLitros: number;
    diferenciaLitros: number;
    precioPorLitro: number;
    deduccionCombustible: number;
};

