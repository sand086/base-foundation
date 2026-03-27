"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl",
        className,
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center px-8",
        // Título del mes: Negrita y tracking tight
        caption_label:
          "text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-300 rounded-lg",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        // REGLA DE ORO: Tipografía Industrial para los días (L, M, M...)
        head_cell:
          "text-slate-400 dark:text-slate-500 rounded-md w-9 text-[9px] font-black uppercase tracking-[0.2em]",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100/50 dark:[&:has([aria-selected])]:bg-white/5",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-xl [&:has(>.day-range-start)]:rounded-l-xl first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl"
            : "[&:has([aria-selected])]:rounded-xl",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all duration-200",
        ),
        // IDENTIDAD: Selección en Brand Red con sombra de profundidad
        day_selected:
          "bg-brand-red text-white hover:bg-brand-red/90 hover:text-white focus:bg-brand-red focus:text-white shadow-lg shadow-brand-red/20 scale-[1.05]",
        // Hoy: Círculo sutil en Navy/Blanco
        day_today: "bg-slate-100 dark:bg-white/10 text-brand-red font-black",
        day_outside:
          "day-outside text-slate-300 dark:text-slate-600 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-400 aria-selected:opacity-30",
        day_disabled: "text-slate-300 dark:text-slate-600 opacity-50",
        day_range_middle:
          "aria-selected:bg-slate-100 dark:aria-selected:bg-white/5 aria-selected:text-slate-900 dark:aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => (
          <ChevronLeft className="h-4 w-4 stroke-[3px]" />
        ),
        IconRight: ({ ..._props }) => (
          <ChevronRight className="h-4 w-4 stroke-[3px]" />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
