/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NotificationCreate = {
    title: string;
    message: string;
    is_read?: boolean;
    event_type?: (string | null);
    reference_id?: (string | null);
    metadata_info?: (Record<string, any> | null);
    user_id: number;
};

