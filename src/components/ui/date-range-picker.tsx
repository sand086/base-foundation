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
 * 1. Trigger: Control h-11 con tipografía de precisión y glass-card.
 * 2. Popover: Liquid Glass Panel con animación de entrada centralizada.
 * 3. Estética: Bordes HD y tracking expansivo.
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
              // Estructura Industrial: h-11 y glass-card
              "h-11 w-full md:w-[300px] justify-start text-left glass-card",
              "border-white/20 transition-all duration-300 hover:border-brand-red/40",
              // Tipografía macOS Industrial
              "text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy/80",
              !dateRange && "text-muted-foreground/60",
            )}
          >
            <div className="icon-plate p-1.5 rounded-lg mr-3 shadow-sm bg-brand-navy/5">
              <CalendarIcon className="h-3.5 w-3.5 text-brand-navy/70" />
            </div>

            <span className="flex-1 truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM yyyy", { locale: es })} —{" "}
                    {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM yyyy", { locale: es })
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </span>

            <ChevronDown className="ml-2 h-3 w-3 opacity-30" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className={cn(
            "w-auto p-0 border-none glass-panel shadow-2xl",
            "animate-modal-show pointer-events-auto overflow-hidden",
            "rounded-2xl",
          )}
          align="end"
          sideOffset={8}
        >
          {/* HEADER DEL POPOVER: bg-brand-navy/95 Estilo Tahoe */}
          <div className="bg-brand-navy/95 px-5 py-4 border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gradient-title text-shadow-premium">
              Cronograma de Operación
            </h4>
          </div>

          <div className="bg-white/40 backdrop-blur-sm p-2">
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
          <div className="bg-white/80 backdrop-blur-xl px-5 py-3 border-t border-brand-navy/5 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 hover:text-brand-red transition-colors"
              onClick={() => onDateRangeChange(undefined)}
            >
              Limpiar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
