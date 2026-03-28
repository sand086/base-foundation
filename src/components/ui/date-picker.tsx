"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  modalTitle?: string;
}

/**
 * DatePicker Industrial Premium - macOS Tahoe Edition
 * Refactorizado para armonizar 1:1 con el componente <Input />
 */
export function DatePicker({
  date,
  onDateChange,
  className,
  placeholder = "Seleccionar fecha",
  modalTitle = "Calendario",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("grid gap-2 w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              // BASE: Altura y alineación (h-11 estándar para tus forms)
              "flex h-11 w-full items-center px-3 py-2 text-sm justify-start text-left font-normal",

              // REGLA 1: Glassmorphism Líquido y Reactividad (Igual al Input)
              "bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl",

              // REGLA 2: Bordes HD y radios orgánicos
              "border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm",

              // REGLA 3: Tipografía Industrial para captura de datos
              "font-medium tracking-tight transition-colors",
              date
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500", // Simula el placeholder

              // REGLA 4 & 5: Hover y Foco con Identidad de Marca (Brand Red)
              "duration-300 ease-out",
              "hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-red))]/50 focus-visible:border-[hsl(var(--brand-red))]",

              // ESTADOS DESHABILITADOS
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:grayscale",
            )}
          >
            {/* Ícono de calendario simple, integrado como un input con ícono */}
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50 shrink-0" />

            <span className="flex-1 truncate mt-[1px]">
              {date ? (
                format(date, "dd MMM yyyy", { locale: es })
              ) : (
                <span>{placeholder}</span>
              )}
            </span>

            {/* Flecha indicadora de dropdown */}
            <ChevronDown className="ml-2 h-4 w-4 opacity-40 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
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
              {modalTitle}
            </h4>
          </div>

          {/* CALENDAR BODY */}
          <div className="p-3 bg-transparent dark:bg-white/[0.02]">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={date}
              selected={date}
              onSelect={(d) => {
                onDateChange(d);
                setIsOpen(false);
              }}
              className="pointer-events-auto"
            />
          </div>

          {/* FOOTER: Safari Style Bar */}
          <div className="bg-slate-50/80 dark:bg-black/40 backdrop-blur-xl px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white"
              onClick={() => {
                onDateChange(new Date());
                setIsOpen(false);
              }}
            >
              Seleccionar Hoy
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                "text-slate-400 dark:text-white/30 hover:text-brand-red dark:hover:text-brand-red hover:bg-brand-red/5",
              )}
              onClick={() => {
                onDateChange(undefined);
                setIsOpen(false);
              }}
            >
              Limpiar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
