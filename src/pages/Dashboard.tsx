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
    <div className="space-y-4">
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

      {/* KPI Cards Row */}
      <KPICards stats={mockServiceStats} />

      {/* Charts Row: On-Time Pie + Top Clients Bar */}
      <div className="grid gap-3 md:grid-cols-2">
        <OnTimeChart stats={mockServiceStats} />
        <TopClientsChart clients={mockClientServices} />
      </div>

      {/* Recent Services Table with contextual navigation */}
      <RecentServicesTable services={mockRecentServices} />

      {/* Operator Statistics Charts */}
      <OperatorStatsCharts operators={mockOperatorStats} />
    </div>
  );
}
