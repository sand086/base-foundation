/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FuelLogCreate = {
    unit_id: number;
    operator_id: number;
    trip_leg_id?: (number | null);
    estacion: string;
    tipo_combustible: string;
    litros: number;
    precio_por_litro: number;
    total: number;
    odometro?: (number | null);
    is_motogenerator?: boolean;
    horometro?: (number | null);
    horas_sm?: (number | null);
    fecha_hora?: (string | null);
    excede_tanque?: boolean;
    capacidad_tanque_snapshot?: (number | null);
};

