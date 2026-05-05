/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
import type { WorkOrderPartResponse } from './WorkOrderPartResponse';
import type { WorkOrderStatus } from './WorkOrderStatus';
export type WorkOrderResponse = {
    id: number;
    folio: string;
    unit_id: number;
    mechanic_id?: (number | null);
    descripcion_problema: string;
    status: WorkOrderStatus;
    tipo_mantenimiento?: (string | null);
    trip_id?: (number | null);
    porcentaje_iva?: number;
    subtotal?: number;
    total?: number;
    costo_mano_obra?: (number | null);
    fecha_apertura?: (string | null);
    fecha_cierre?: (string | null);
    unit_numero?: (string | null);
    mechanic_nombre?: (string | null);
    parts?: Array<WorkOrderPartResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

