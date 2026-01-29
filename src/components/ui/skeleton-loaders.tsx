import { cn } from "@/lib/utils";

// ============================================
// KPI Card Skeleton
// ============================================
export function KPISkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 space-y-4",
        className
      )}
    >
      {/* Icon + Title row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md glass-shimmer" />
        <div className="h-8 w-8 rounded-lg glass-shimmer" />
      </div>
      
      {/* Main value */}
      <div className="h-9 w-32 rounded-md glass-shimmer" />
      
      {/* Trend indicator */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 rounded-md glass-shimmer" />
        <div className="h-4 w-20 rounded-md glass-shimmer" />
      </div>
    </div>
  );
}

// ============================================
// Dashboard KPIs Grid Skeleton
// ============================================
export function DashboardKPIsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KPISkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// Chart Skeleton
// ============================================
export function ChartSkeleton({ 
  className,
  height = "h-[300px]" 
}: { 
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 space-y-4",
        className
      )}
    >
      {/* Chart header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-md glass-shimmer" />
          <div className="h-3 w-48 rounded-md glass-shimmer" />
        </div>
        <div className="h-8 w-24 rounded-md glass-shimmer" />
      </div>
      
      {/* Chart area */}
      <div className={cn("rounded-lg glass-shimmer", height)} />
    </div>
  );
}

// ============================================
// Table Skeleton
// ============================================
export function TableSkeleton({ 
  rows = 5,
  columns = 4,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("glass-card rounded-xl overflow-hidden", className)}>
      {/* Table header */}
      <div className="bg-muted/30 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 rounded-md glass-shimmer"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      
      {/* Table rows */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div 
            key={rowIdx} 
            className="px-4 py-3 flex gap-4"
            style={{ animationDelay: `${rowIdx * 50}ms` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div 
                key={colIdx} 
                className="h-4 rounded-md glass-shimmer"
                style={{ 
                  width: colIdx === 0 ? '30%' : `${70 / (columns - 1)}%`,
                  animationDelay: `${(rowIdx * columns + colIdx) * 30}ms`
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Full Dashboard Skeleton
// ============================================
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-page-enter">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md glass-shimmer" />
          <div className="h-4 w-64 rounded-md glass-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md glass-shimmer" />
          <div className="h-9 w-32 rounded-md glass-shimmer" />
        </div>
      </div>

      {/* KPIs */}
      <DashboardKPIsSkeleton count={4} />

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

// ============================================
// Page Loading Skeleton
// ============================================
export function PageSkeleton({ 
  showHeader = true,
  showTable = true,
  tableRows = 8 
}: { 
  showHeader?: boolean;
  showTable?: boolean;
  tableRows?: number;
}) {
  return (
    <div className="space-y-6 animate-page-enter">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-md glass-shimmer" />
            <div className="h-4 w-72 rounded-md glass-shimmer" />
          </div>
          <div className="h-9 w-32 rounded-md glass-shimmer" />
        </div>
      )}

      {showTable && <TableSkeleton rows={tableRows} columns={6} />}
    </div>
  );
}

// ============================================
// Card Content Skeleton
// ============================================
export function CardContentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 rounded-md glass-shimmer"
          style={{ 
            width: i === lines - 1 ? '60%' : '100%',
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Inline Skeleton (for text placeholders)
// ============================================
export function InlineSkeleton({ 
  width = "w-24",
  height = "h-4",
  className 
}: { 
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <span 
      className={cn(
        "inline-block rounded glass-shimmer",
        width,
        height,
        className
      )} 
    />
  );
}
