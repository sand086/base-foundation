/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecordStatus } from './RecordStatus';
export type TripTimelineEventResponse = {
    time: string;
    event: string;
    event_type?: string;
    location?: (string | null);
    lat?: (string | null);
    lng?: (string | null);
    comments?: (string | null);
    id: number;
    trip_leg_id: number;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
    created_by_id?: (number | null);
    updated_by_id?: (number | null);
};

