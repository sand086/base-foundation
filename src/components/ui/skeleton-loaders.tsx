import { cn } from "@/lib/utils";

/**
 * Skeletons UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Liquid Shimmer: Efecto de barrido de luz direccional (no solo pulso).
 * 2. Glassmorphism: Contenedores con backdrop-blur y bordes HD.
 * 3. Industrial Layout: Proporciones exactas de la "Instrument Edition".
 */

// Clase base para el efecto de brillo animado
const shimmerClass = cn(
  "relative overflow-hidden rounded-md",
  "bg-slate-200/50 dark:bg-white/5",
  "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
  "before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent",
);

// ============================================
// KPI Card Skeleton
// ============================================
export function KPISkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-6 space-y-5 transition-all duration-500",
        "bg-white/60 dark:bg-brand-navy/40 border border-slate-200/60 dark:border-white/10 shadow-sm",
        className,
      )}
    >
      {/* Icon + Title row */}
      <div className="flex items-center justify-between">
        <div className={cn("h-3 w-24", shimmerClass)} />
        <div className={cn("h-10 w-10 rounded-xl", shimmerClass)} />
      </div>

      {/* Main value */}
      <div className={cn("h-10 w-32", shimmerClass)} />

      {/* Trend indicator */}
      <div className="flex items-center gap-2 pt-2">
        <div className={cn("h-4 w-12 rounded-full", shimmerClass)} />
        <div className={cn("h-3 w-20", shimmerClass)} />
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
  height = "h-[300px]",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-6 space-y-6 transition-all duration-500",
        "bg-white/60 dark:bg-brand-navy/40 border border-slate-200/60 dark:border-white/10",
        className,
      )}
    >
      {/* Chart header */}
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className={cn("h-5 w-40", shimmerClass)} />
          <div className={cn("h-3 w-64 opacity-60", shimmerClass)} />
        </div>
        <div className={cn("h-10 w-28 rounded-xl", shimmerClass)} />
      </div>

      {/* Chart area: Hollowed Glass Effect */}
      <div
        className={cn(
          "rounded-2xl border border-slate-200/30 dark:border-white/5",
          height,
          shimmerClass,
        )}
      />
    </div>
  );
}

// ============================================
// Table Skeleton
// ============================================
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 shadow-xl",
        "bg-white/40 dark:bg-brand-navy/20 backdrop-blur-md",
        className,
      )}
    >
      {/* Table header: Estilo Instrument Panel Oscuro (Match con DataTable real) */}
      <div className="bg-brand-navy/95 dark:bg-black/60 px-6 py-4 flex gap-6 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn("h-3 opacity-30", shimmerClass)}
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>

      {/* Table rows */}
      <div className="divide-y divide-slate-200/50 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex gap-6 items-center">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={cn("h-4", shimmerClass)}
                style={{
                  width: colIdx === 0 ? "35%" : `${65 / (columns - 1)}%`,
                  opacity: 1 - rowIdx * 0.1, // Desvanecimiento gradual premium
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
    <div className="space-y-8 animate-page-enter">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className={cn("h-9 w-64", shimmerClass)} />
          <div className={cn("h-4 w-80 opacity-60", shimmerClass)} />
        </div>
        <div className="flex gap-3">
          <div className={cn("h-11 w-28 rounded-xl", shimmerClass)} />
          <div className={cn("h-11 w-36 rounded-xl", shimmerClass)} />
        </div>
      </div>

      {/* KPIs */}
      <DashboardKPIsSkeleton count={4} />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

// ============================================
// Inline Helpers
// ============================================
export function InlineSkeleton({
  width = "w-24",
  height = "h-4",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <span className={cn(shimmerClass, width, height, className)} />;
}
