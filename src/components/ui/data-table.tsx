"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DataTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

const DataTable = React.forwardRef<HTMLTableElement, DataTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl transition-all duration-500",
          "glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
          "bg-white/60 dark:bg-brand-navy/30 backdrop-blur-xl border border-white/20 dark:border-white/10",
        )}
      >
        <div className="overflow-auto custom-scrollbar max-h-[75vh]">
          <table
            ref={ref}
            className={cn(
              "w-full caption-bottom text-sm border-collapse",
              "table-staggered",
              className,
            )}
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    );
  },
);
DataTable.displayName = "DataTable";

const DataTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-brand-navy/95 dark:bg-black/60 backdrop-blur-md sticky top-0 z-20",
      "border-b border-white/10 shadow-sm",
      className,
    )}
    {...props}
  />
));
DataTableHeader.displayName = "DataTableHeader";

const DataTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "divide-y divide-slate-200/50 dark:divide-white/5 bg-transparent",
      className,
    )}
    {...props}
  />
));
DataTableBody.displayName = "DataTableBody";

const DataTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "interactive-row transition-all duration-300 group outline-none",
      "hover:bg-slate-500/[0.05] dark:hover:bg-white/[0.03]",
      "data-[state=selected]:bg-brand-red/[0.05] relative",
      "data-[state=selected]:before:absolute data-[state=selected]:before:left-0 data-[state=selected]:before:top-0 data-[state=selected]:before:h-full data-[state=selected]:before:w-1 data-[state=selected]:before:bg-brand-red",
      className,
    )}
    {...props}
  />
));
DataTableRow.displayName = "DataTableRow";

const DataTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-5 py-4 text-left align-middle transition-colors",
      "text-[10px] font-black uppercase tracking-[0.25em]",
      "text-white/60 hover:text-white group/head",
      className,
    )}
    {...props}
  />
));
DataTableHead.displayName = "DataTableHead";

const DataTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-5 py-4 align-middle transition-all duration-300",
      "text-[13px] font-medium text-slate-700 dark:text-white/70 tracking-tight",
      //  SOLUCIÓN: Eliminado el color forzado en hover que te blanqueaba las letras
      className,
    )}
    {...props}
  />
));
DataTableCell.displayName = "DataTableCell";

export {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
};
