/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OperatorStatus } from "./OperatorStatus";
import type { RecordStatus } from "./RecordStatus";
export type OperatorResponse = {
  public_id?: string | null;
  name: string;
  license_number: string;
  license_type_id?: string;
  license_expiry: string;
  medical_check_expiry: string;
  phone?: string | null;
  status?: OperatorStatus;
  assigned_unit_id?: number | null;
  hire_date?: string | null;
  rfc?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  foto_url?: string | null;
  licencia_url?: string | null;
  ine_url?: string | null;
  apto_medico_url?: string | null;
  comprobante_domicilio_url?: string | null;
  id: number;
  record_status: RecordStatus;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_id?: number | null;
  updated_by_id?: number | null;
};
