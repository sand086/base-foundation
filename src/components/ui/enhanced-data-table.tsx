"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Search,
  Filter,
  Download,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarIcon,
  X,
  Loader2,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";

// Types
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  type?: "text" | "date" | "status" | "number";
  statusOptions?: string[];
  statusNormalizer?: (value: any) => string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

//  AÑADIDO: initialSort para ordenar por fecha de más reciente a más viejo
interface EnhancedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
  onRowClick?: (row: T) => void;
  exportFileName?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  selectedRows?: T[];
  onSelectedRowsChange?: (rows: T[]) => void;
  rowKey?: keyof T;
  customFilters?: React.ReactNode;
  onCustomExport?: () => void;
  isRowSelectable?: (row: T) => boolean;
  initialSort?: SortConfig;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ColumnFilters {
  [key: string]: {
    type: "text" | "date" | "status";
    value: string | DateRange | string[];
  };
}

//   Función que extrae TODOS los textos y números de un objeto (Deep Search)
const extractAllValues = (obj: any): string => {
  if (obj === null || obj === undefined) return "";
  if (
    typeof obj === "string" ||
    typeof obj === "number" ||
    typeof obj === "boolean"
  ) {
    return String(obj).toLowerCase();
  }
  if (Array.isArray(obj)) {
    return obj.map(extractAllValues).join(" ");
  }
  if (typeof obj === "object") {
    return Object.values(obj).map(extractAllValues).join(" ");
  }
  return "";
};

export function EnhancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  onRowClick,
  exportFileName = "export",
  searchPlaceholder = "BUSCAR EN CUALQUIER COLUMNA...",
  isLoading = false,
  enableRowSelection = false,
  selectedRows = [],
  onSelectedRowsChange,
  rowKey = "id" as keyof T,
  customFilters,
  onCustomExport,
  isRowSelectable,
  initialSort,
}: EnhancedDataTableProps<T>) {
  const [globalSearch, setGlobalSearch] = useState("");
  //  INICIALIZA EL ORDEN CON LO QUE LE MANDEMOS DESDE EL PADRE
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    initialSort || null,
  );
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const getValue = (row: T, key: string): any => {
    return key.split(".").reduce((obj, k) => obj?.[k], row);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    //   Buscador global inteligente
    if (globalSearch) {
      const searchTerms = globalSearch
        .toLowerCase()
        .split(" ")
        .filter((t) => t.trim() !== "");

      result = result.filter((row) => {
        let rowText = extractAllValues(row);

        columns.forEach((col) => {
          if (col.statusNormalizer) {
            const rawValue = getValue(row, col.key as string);
            if (rawValue) {
              rowText +=
                " " + String(col.statusNormalizer(rawValue)).toLowerCase();
            }
          }
        });

        return searchTerms.every((term) => rowText.includes(term));
      });
    }

    // --- Filtros Internos Específicos ---
    Object.entries(columnFilters).forEach(([key, filter]) => {
      if (!filter.value) return;

      if (
        filter.type === "date" &&
        typeof filter.value === "object" &&
        "from" in filter.value
      ) {
        const range = filter.value as DateRange;
        if (range.from || range.to) {
          result = result.filter((row) => {
            const rowVal = getValue(row, key);
            if (!rowVal) return false;

            const dateValue = new Date(rowVal);

            if (range.from) {
              const fromDate = new Date(range.from);
              fromDate.setHours(0, 0, 0, 0);
              if (dateValue < fromDate) return false;
            }
            if (range.to) {
              const toDate = new Date(range.to);
              toDate.setHours(23, 59, 59, 999);
              if (dateValue > toDate) return false;
            }
            return true;
          });
        }
      } else if (
        filter.type === "status" &&
        Array.isArray(filter.value) &&
        filter.value.length > 0
      ) {
        const statusValues = filter.value as string[];
        const column = columns.find((c) => String(c.key) === key);

        result = result.filter((row) => {
          const rawValue = getValue(row, key);
          const comparableValue = column?.statusNormalizer
            ? column.statusNormalizer(rawValue)
            : String(rawValue ?? "");

          return statusValues.includes(comparableValue);
        });
      }
    });

    return result;
  }, [data, globalSearch, columnFilters, columns]);

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    if (pageSize === -1) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages =
    pageSize === -1 ? 1 : Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return null;
      return { key, direction: "asc" };
    });
  };

  const handleCopyToClipboard = async () => {
    const headers = columns.map((c) => c.header).join("\t");
    const rows = sortedData
      .map((row) =>
        columns.map((col) => getValue(row, col.key as string)).join("\t"),
      )
      .join("\n");

    await navigator.clipboard.writeText(`${headers}\n${rows}`);
    toast.success("Datos copiados al portapapeles", {
      description: "Listo para pegar en tu hoja de cálculo.",
    });
  };

  const handleExportExcel = () => {
    const exportData = sortedData.map((row) =>
      columns.reduce(
        (acc, col) => {
          acc[col.header] = getValue(row, col.key as string);
          return acc;
        },
        {} as Record<string, any>,
      ),
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
    toast.success("Reporte Exportado", {
      description: "Archivo Excel descargado correctamente.",
    });
  };

  const clearFilters = () => {
    setColumnFilters({});
    setGlobalSearch("");
  };

  const hasActiveFilters =
    Object.keys(columnFilters).length > 0 || globalSearch;

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key)
      return (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-30 dark:opacity-40 ml-2" />
      );
    if (sortConfig.direction === "asc")
      return <ChevronUp className="h-3.5 w-3.5 text-brand-red ml-2" />;
    return <ChevronDown className="h-3.5 w-3.5 text-brand-red ml-2" />;
  };

  const selectablePaginatedData = useMemo(() => {
    return paginatedData.filter((row) =>
      isRowSelectable ? isRowSelectable(row) : true,
    );
  }, [paginatedData, isRowSelectable]);

  const hasAdvancedFilters = useMemo(() => {
    return columns.some(
      (col) =>
        col.type === "date" ||
        (col.type === "status" &&
          col.statusOptions &&
          col.statusOptions.length > 0),
    );
  }, [columns]);

  return (
    <div className={cn("space-y-4 animate-in fade-in duration-500", className)}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-2 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 shadow-inner mb-6">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px] max-w-md group">
            <Search className="absolute z-10 left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-white/60 pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-none shadow-sm text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-brand-red/20 transition-all rounded-xl"
            />
          </div>

          {customFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {customFilters}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {hasAdvancedFilters && (
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 px-5 border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm rounded-xl haptic-press",
                    Object.keys(columnFilters).length > 0
                      ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20 hover:bg-red-700 hover:text-white"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-white/70 hover:text-brand-navy dark:hover:text-white",
                  )}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros Int.
                  {Object.keys(columnFilters).length > 0 && (
                    <Badge className="ml-2 h-5 px-1.5 bg-white/20 text-white border-none shadow-sm font-mono text-[10px]">
                      {Object.keys(columnFilters).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 glass-panel bg-white/95 dark:bg-brand-navy/95 border-slate-200 dark:border-white/10 shadow-2xl p-6 backdrop-blur-2xl rounded-2xl"
                align="end"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-4">
                    <h4 className="text-[11px] font-black text-brand-navy dark:text-white uppercase tracking-[0.2em]">
                      Filtros Avanzados
                    </h4>
                    {Object.keys(columnFilters).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setColumnFilters({})}
                        className="h-7 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 haptic-press rounded-lg"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="max-h-[300px] pr-4 custom-scrollbar">
                    <div className="space-y-6">
                      {columns.map((col) => {
                        const key = col.key as string;
                        const colType = col.type || "text";

                        if (colType === "date") {
                          const dateFilter = (columnFilters[key]
                            ?.value as DateRange) || {
                            from: undefined,
                            to: undefined,
                          };
                          return (
                            <div key={key} className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 block">
                                {col.header}
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="h-10 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest justify-start text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 haptic-press"
                                    >
                                      <CalendarIcon className="h-3.5 w-3.5 mr-2 text-slate-400 dark:text-white/40" />
                                      {dateFilter.from
                                        ? format(dateFilter.from, "dd/MM/yy")
                                        : "Desde"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0 glass-panel bg-white dark:bg-brand-navy border-slate-200 dark:border-white/10 rounded-2xl shadow-xl"
                                    align="start"
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={dateFilter.from}
                                      onSelect={(date) => {
                                        setColumnFilters((prev) => ({
                                          ...prev,
                                          [key]: {
                                            type: "date",
                                            value: {
                                              ...dateFilter,
                                              from: date,
                                            },
                                          },
                                        }));
                                        setCurrentPage(1);
                                      }}
                                      locale={es}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="h-10 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest justify-start text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 haptic-press"
                                    >
                                      <CalendarIcon className="h-3.5 w-3.5 mr-2 text-slate-400 dark:text-white/40" />
                                      {dateFilter.to
                                        ? format(dateFilter.to, "dd/MM/yy")
                                        : "Hasta"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0 glass-panel bg-white dark:bg-brand-navy border-slate-200 dark:border-white/10 rounded-2xl shadow-xl"
                                    align="start"
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={dateFilter.to}
                                      onSelect={(date) => {
                                        setColumnFilters((prev) => ({
                                          ...prev,
                                          [key]: {
                                            type: "date",
                                            value: { ...dateFilter, to: date },
                                          },
                                        }));
                                        setCurrentPage(1);
                                      }}
                                      locale={es}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          );
                        }

                        if (colType === "status" && col.statusOptions) {
                          const selectedStatuses =
                            (columnFilters[key]?.value as string[]) || [];
                          return (
                            <div key={key} className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 block">
                                {col.header}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {col.statusOptions.map((status) => (
                                  <div
                                    key={status}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all haptic-press select-none",
                                      selectedStatuses.includes(status)
                                        ? "bg-brand-navy dark:bg-white text-white dark:text-brand-navy border-brand-navy dark:border-white shadow-md"
                                        : "bg-white dark:bg-white/5 text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10",
                                    )}
                                    onClick={() => {
                                      const newSelected =
                                        selectedStatuses.includes(status)
                                          ? selectedStatuses.filter(
                                              (s) => s !== status,
                                            )
                                          : [...selectedStatuses, status];

                                      if (newSelected.length === 0) {
                                        const { [key]: _, ...rest } =
                                          columnFilters;
                                        setColumnFilters(rest);
                                      } else {
                                        setColumnFilters((prev) => ({
                                          ...prev,
                                          [key]: {
                                            type: "status",
                                            value: newSelected,
                                          },
                                        }));
                                      }
                                      setCurrentPage(1);
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedStatuses.includes(
                                        status,
                                      )}
                                      className="h-3 w-3 border-current rounded-sm"
                                    />
                                    {status}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            className="h-11 px-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all rounded-xl haptic-press"
            onClick={handleCopyToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" /> Copiar
          </Button>
          <Button
            variant="outline"
            className="h-11 px-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 shadow-sm transition-all rounded-xl haptic-press"
            onClick={onCustomExport ? onCustomExport : handleExportExcel}
          >
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-brand-navy/30 backdrop-blur-xl shadow-2xl transition-all">
        <div className="overflow-auto max-h-[65vh] custom-scrollbar">
          <table className="w-full caption-bottom text-sm border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
                {enableRowSelection && (
                  <th className="h-14 px-6 py-4 text-center align-middle w-16">
                    <Checkbox
                      disabled={selectablePaginatedData.length === 0}
                      checked={
                        selectablePaginatedData.length > 0 &&
                        selectablePaginatedData.every((row) =>
                          selectedRows?.some(
                            (sr) => sr[rowKey] === row[rowKey],
                          ),
                        )
                      }
                      onCheckedChange={(checked) => {
                        if (!onSelectedRowsChange) return;
                        if (checked) {
                          const newRows = [...selectedRows];
                          selectablePaginatedData.forEach((row) => {
                            if (
                              !newRows.some((sr) => sr[rowKey] === row[rowKey])
                            ) {
                              newRows.push(row);
                            }
                          });
                          onSelectedRowsChange(newRows);
                        } else {
                          const newRows = selectedRows.filter(
                            (sr) =>
                              !selectablePaginatedData.some(
                                (row) => row[rowKey] === sr[rowKey],
                              ),
                          );
                          onSelectedRowsChange(newRows);
                        }
                      }}
                    />
                  </th>
                )}

                {columns.map((col) => (
                  <th
                    key={col.key as string}
                    className={cn(
                      "h-14 px-6 py-4 text-left align-middle transition-colors",
                      "text-[14px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white group/head",
                      col.sortable !== false && "cursor-pointer select-none",
                      col.width,
                    )}
                    onClick={() =>
                      col.sortable !== false && handleSort(col.key as string)
                    }
                  >
                    <div className="flex items-center">
                      {col.header}
                      {col.sortable !== false && getSortIcon(col.key as string)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 bg-transparent">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                    className="p-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-brand-red" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">
                        Cargando Registros...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                    className="p-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                      <TableIcon size={48} strokeWidth={1.5} />
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                        Cero Coincidencias en el Ledger
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const isSelectable = isRowSelectable
                    ? isRowSelectable(row)
                    : true;

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "interactive-row transition-all duration-300 outline-none group",
                        "hover:bg-slate-500/[0.04] dark:hover:bg-white/[0.02]",
                        selectedRows?.some(
                          (sr) => sr[rowKey] === row[rowKey],
                        ) && "bg-brand-navy/5 dark:bg-brand-navy/20",
                        onRowClick && "cursor-pointer active:scale-[0.998]",
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {enableRowSelection && (
                        <td
                          className="px-6 py-4 align-middle text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            disabled={!isSelectable}
                            checked={selectedRows?.some(
                              (sr) => sr[rowKey] === row[rowKey],
                            )}
                            onCheckedChange={(checked) => {
                              if (!onSelectedRowsChange || !isSelectable)
                                return;
                              if (checked) {
                                onSelectedRowsChange([...selectedRows, row]);
                              } else {
                                onSelectedRowsChange(
                                  selectedRows.filter(
                                    (sr) => sr[rowKey] !== row[rowKey],
                                  ),
                                );
                              }
                            }}
                          />
                        </td>
                      )}

                      {columns.map((col) => (
                        <td
                          key={col.key as string}
                          className={cn(
                            "px-6 py-4 align-middle transition-all duration-300",
                            "text-[13px] font-medium text-slate-700 dark:text-slate-300 tracking-tight",
                            //  MAGIA 3: AQUÍ ESTABA EL BUG DE LAS LETRAS BLANCAS. Lo hemos eliminado.
                          )}
                        >
                          {col.render
                            ? col.render(getValue(row, col.key as string), row)
                            : getValue(row, col.key as string)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CAPA 4: FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 border-t border-slate-200/50 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40">
              Registros por vista
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(val === "all" ? -1 : Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-[90px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-mono font-black text-xs text-slate-700 dark:text-white shadow-sm rounded-xl haptic-press">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white dark:bg-brand-navy border-slate-200 dark:border-white/10 shadow-2xl">
                <SelectItem value="10" className="font-mono font-bold text-xs">
                  10
                </SelectItem>
                <SelectItem value="20" className="font-mono font-bold text-xs">
                  20
                </SelectItem>
                <SelectItem value="50" className="font-mono font-bold text-xs">
                  50
                </SelectItem>
                <SelectItem value="100" className="font-mono font-bold text-xs">
                  100
                </SelectItem>
                <SelectItem
                  value="all"
                  className="font-black text-[10px] uppercase"
                >
                  Todos
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 text-slate-500 font-mono font-black text-[11px] shadow-sm bg-white dark:bg-slate-900"
            >
              Total: {sortedData.length}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-white/70">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy dark:hover:text-white hover:bg-slate-50 shadow-sm haptic-press"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || pageSize === -1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy dark:hover:text-white hover:bg-slate-50 shadow-sm haptic-press"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageSize === -1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy dark:hover:text-white hover:bg-slate-50 shadow-sm haptic-press"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || pageSize === -1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-navy dark:hover:text-white hover:bg-slate-50 shadow-sm haptic-press"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || pageSize === -1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
