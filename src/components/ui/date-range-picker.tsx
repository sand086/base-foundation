"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

/**
 * DateRangePicker Industrial Premium - macOS Tahoe Edition
 * Refactorización:
 * 1. Theme Awareness: Soporte dinámico para Light y Dark Mode.
 * 2. Visual Style: Trigger h-11 tipo "instrumento de precisión".
 * 3. Popover: Panel de cristal líquido con bordes HD y footer Safari-style.
 */
export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  placeholder = "Seleccionar periodo",
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              // ESTRUCTURA INDUSTRIAL: h-11 y Glass Effect
              "h-11 w-full md:w-[320px] justify-start text-left transition-all duration-300",
              "glass-card bg-white/50 dark:bg-white/5 backdrop-blur-md",
              "border-slate-200 dark:border-white/10 hover:border-brand-red/40 dark:hover:border-brand-red/60",
              "shadow-sm hover:shadow-md active:scale-[0.98]",

              // TIPOGRAFÍA MACOS INDUSTRIAL
              "text-[10px] font-black uppercase tracking-[0.2em]",
              "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white",

              !dateRange && "text-slate-400 dark:text-white/30",
            )}
          >
            {/* ICON PLATE: El receptáculo del icono */}
            <div className="icon-plate p-1.5 rounded-lg mr-3 shadow-inner bg-slate-100 dark:bg-white/5 transition-colors group-hover:bg-brand-red/10">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500 dark:text-white/40" />
            </div>

            <span className="flex-1 truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  <span className="flex items-center gap-2">
                    {format(dateRange.from, "dd MMM yyyy", { locale: es })}
                    <span className="opacity-30">—</span>
                    {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                  </span>
                ) : (
                  format(dateRange.from, "dd MMM yyyy", { locale: es })
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </span>

            <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-30 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className={cn(
            "w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden",
            "bg-white/95 dark:bg-brand-navy/95 backdrop-blur-2xl",
            "animate-modal-show pointer-events-auto",
          )}
          align="start"
          sideOffset={8}
        >
          {/* HEADER DEL POPOVER: Estilo Consola de Mando */}
          <div className="bg-brand-navy/95 dark:bg-black/40 px-5 py-4 border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <h4 className="relative z-10 text-[10px] font-black uppercase tracking-[0.25em] text-white/90">
              Cronograma de Operación
            </h4>
          </div>

          {/* CALENDAR BODY */}
          <div className="p-3 bg-transparent dark:bg-white/[0.02]">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </div>

          {/* FOOTER: Safari Style Bar */}
          <div className="bg-slate-50/80 dark:bg-black/40 backdrop-blur-xl px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                "text-slate-400 dark:text-white/30 hover:text-brand-red dark:hover:text-brand-red hover:bg-brand-red/5",
              )}
              onClick={() => onDateRangeChange(undefined)}
            >
              Limpiar Periodo
            </Button>

            {/* Indicador visual de selección activa */}
            {dateRange?.from && (
              <div className="flex items-center px-3 py-1 bg-brand-red/10 border border-brand-red/20 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse mr-2" />
                <span className="text-[9px] font-black uppercase text-brand-red">
                  Periodo Activo
                </span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
