import * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div
      className={cn(
        // Tahoe Glass Wrapper: Contenedor con cristal translúcido, borde brillante y sombra profunda
        "relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xl liquid-glass-table",
        wrapperClassName,
      )}
    >
      <div className={cn("overflow-auto custom-scrollbar", wrapperClassName)}>
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b-0",
      "sticky top-0 z-20",
      // Fondo sutil para separar el header del body sin perder el cristal
      "backdrop-blur-md bg-slate-900/5 dark:bg-white/5",
      "border-b border-white/20",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      "table-staggered", // Mantenemos tu animación en cascada
      className,
    )}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      // Footer tipo barra Safari
      "border-t border-white/20 bg-white/50 backdrop-blur-md font-bold [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "group",
      // Borde sutil de cristal entre filas
      "border-b border-white/10 dark:border-white/5",
      "transition-colors duration-200 ease-out interactive-row",
      "data-[state=selected]:bg-white/60 dark:data-[state=selected]:bg-white/10",
      "hover:bg-white/50 dark:hover:bg-white/5",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-6 text-left align-middle",
      // Tahoe Crisp Typography para encabezados de tabla
      "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500",
      "[&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-6 align-middle", // Aumentamos un poco el padding para que respire más (estilo Apple)
      "text-sm font-medium text-slate-700 dark:text-slate-300",
      "[&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      // Estilo de descripción técnica
      "mt-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400",
      className,
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
