/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlertConfigResponse } from '../models/AlertConfigResponse';
import type { AlertConfigUpdate } from '../models/AlertConfigUpdate';
import type { EmailTemplateResponse } from '../models/EmailTemplateResponse';
import type { EmailTemplateUpdate } from '../models/EmailTemplateUpdate';
import type { NotificationCreate } from '../models/NotificationCreate';
import type { NotificationResponse } from '../models/NotificationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MonitoringNotificationsService {
    /**
     * Get Alert Config
     * @returns AlertConfigResponse Successful Response
     * @throws ApiError
     */
    public static getAlertConfigApiMonitoringConfigGet(): CancelablePromise<AlertConfigResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monitoring/config',
        });
    }
    /**
     * Update Alert Config
     * @param requestBody
     * @returns AlertConfigResponse Successful Response
     * @throws ApiError
     */
    public static updateAlertConfigApiMonitoringConfigPut(
        requestBody: AlertConfigUpdate,
    ): CancelablePromise<AlertConfigResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/monitoring/config',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Templates
     * @returns EmailTemplateResponse Successful Response
     * @throws ApiError
     */
    public static getAllTemplatesApiMonitoringTemplatesGet(): CancelablePromise<Array<EmailTemplateResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monitoring/templates',
        });
    }
    /**
     * Update Template
     * @param templateId
     * @param requestBody
     * @returns EmailTemplateResponse Successful Response
     * @throws ApiError
     */
    public static updateTemplateApiMonitoringTemplatesTemplateIdPut(
        templateId: number,
        requestBody: EmailTemplateUpdate,
    ): CancelablePromise<EmailTemplateResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/monitoring/templates/{template_id}',
            path: {
                'template_id': templateId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Notification
     * @param requestBody
     * @returns NotificationResponse Successful Response
     * @throws ApiError
     */
    public static createNotificationApiMonitoringPost(
        requestBody: NotificationCreate,
    ): CancelablePromise<NotificationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/monitoring/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get My Notifications
     * @returns NotificationResponse Successful Response
     * @throws ApiError
     */
    public static getMyNotificationsApiMonitoringMeGet(): CancelablePromise<Array<NotificationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monitoring/me',
        });
    }
    /**
     * Mark Notification As Read
     * @param notifId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static markNotificationAsReadApiMonitoringNotifIdReadPatch(
        notifId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/monitoring/{notif_id}/read',
            path: {
                'notif_id': notifId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Mark All As Read
     * @returns any Successful Response
     * @throws ApiError
     */
    public static markAllAsReadApiMonitoringMarkAllReadPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/monitoring/mark-all-read',
        });
    }
}
