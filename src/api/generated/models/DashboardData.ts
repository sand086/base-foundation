/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientServiceCount } from './ClientServiceCount';
import type { OperatorStats } from './OperatorStats';
import type { RecentService } from './RecentService';
import type { ServiceStats } from './ServiceStats';
export type DashboardData = {
    serviceStats: ServiceStats;
    clientServices: Array<ClientServiceCount>;
    operatorStats: Array<OperatorStats>;
    recentServices: Array<RecentService>;
};

