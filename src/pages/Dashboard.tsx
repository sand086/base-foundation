import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";

// Dashboard feature components
import { KPICards } from "@/features/dashboard/KPICards";
import { OnTimeChart } from "@/features/dashboard/OnTimeChart";
import { TopClientsChart } from "@/features/dashboard/TopClientsChart";
import { OperatorStatsCharts } from "@/features/dashboard/OperatorStatsCharts";
import { RecentServicesTable } from "@/features/dashboard/RecentServicesTable";

// Mock data
import {
  mockServiceStats,
  mockClientServices,
  mockOperatorStats,
  mockRecentServices,
} from "@/data/dashboardData";

export default function Dashboard() {
  // Date range filter - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  return (
    <div className="space-y-6">
      {/* Page Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Dashboard"
          description="Resumen operativo en tiempo real"
        />
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          placeholder="Filtrar por periodo"
        />
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
        {/* KPI Cards - Top Row (4 cards, 1 column each) */}
        <div className="bento-card">
          <KPICards stats={mockServiceStats} />
        </div>

        {/* On-Time Chart - Featured Large Card */}
        <div className="md:col-span-2 md:row-span-2 bento-card bento-card-featured">
          <OnTimeChart stats={mockServiceStats} />
        </div>

        {/* Top Clients Chart */}
        <div className="md:col-span-2 md:row-span-2 bento-card">
          <TopClientsChart clients={mockClientServices} />
        </div>

        {/* Operator Statistics */}
        <div className="md:col-span-4 bento-card">
          <OperatorStatsCharts operators={mockOperatorStats} />
        </div>

        {/* Recent Services Table - Full Width */}
        <div className="md:col-span-4 bento-card">
          <RecentServicesTable services={mockRecentServices} />
        </div>
      </div>
    </div>
  );
}
