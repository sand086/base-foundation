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

      {/* KPI Cards - Always 4 columns, responsive sizing */}
      <KPICards stats={mockServiceStats} />

      {/* Charts Row: On-Time Pie + Top Clients Bar */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bento-card bento-card-featured min-h-[280px]">
          <OnTimeChart stats={mockServiceStats} />
        </div>
        <div className="bento-card min-h-[280px]">
          <TopClientsChart clients={mockClientServices} />
        </div>
      </div>

      {/* Recent Services Table - Full Width */}
      <div className="bento-card">
        <RecentServicesTable services={mockRecentServices} />
      </div>

      {/* Operator Statistics */}
      <div className="bento-card">
        <OperatorStatsCharts operators={mockOperatorStats} />
      </div>
    </div>
  );
}
